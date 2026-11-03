package main

import (
	"crypto/hmac"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/csv"
	"encoding/hex"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
)

const cookieName = "mt_session"

var (
	password     = os.Getenv("APP_PASSWORD")
	secret       = []byte(os.Getenv("SESSION_SECRET"))
	cookieSecure = os.Getenv("COOKIE_SECURE") != "false"
)

func sign(exp int64) string {
	m := hmac.New(sha256.New, secret)
	fmt.Fprintf(m, "v1|%d", exp)
	return fmt.Sprintf("%d.%s", exp, hex.EncodeToString(m.Sum(nil)))
}

func validSession(v string) bool {
	parts := strings.SplitN(v, ".", 2)
	if len(parts) != 2 {
		return false
	}
	exp, err := strconv.ParseInt(parts[0], 10, 64)
	if err != nil || time.Now().Unix() > exp {
		return false
	}
	return hmac.Equal([]byte(sign(exp)), []byte(v))
}

func requireAuth(c *fiber.Ctx) error {
	if validSession(c.Cookies(cookieName)) {
		return c.Next()
	}
	return c.Status(401).JSON(fiber.Map{"error": "لطفاً وارد شوید."})
}

func main() {
	// `moneytracker parse statement.pdf` prints what the parser finds (for testing).
	if len(os.Args) == 3 && os.Args[1] == "parse" {
		text, err := pdfToText(os.Args[2])
		if err != nil {
			log.Fatal(err)
		}
		txs := ParseStatement(text)
		Categorize(txs, defaultSettings(), defaultRules(), nil)
		var dr, cr int64
		months := map[string]bool{}
		for _, t := range txs {
			dr += t.Debit
			cr += t.Credit
			months[t.Month] = true
		}
		fmt.Printf("transactions=%d debit=%d credit=%d\n", len(txs), dr, cr)
		var ms []string
		for m := range months {
			ms = append(ms, m)
		}
		sort.Strings(ms)
		for _, m := range ms {
			sum, lines, needs := summarize(m, txs, defaultCategories())
			fmt.Printf("\n== %s %s..%s n=%d income=%d spending=%d unlabeledOut=%d saved=%d needs=%d\n",
				m, sum.FirstDate, sum.LastDate, sum.Count, sum.Income, sum.Spending, sum.UnlabeledOut, sum.Saved, sum.NeedsLabel)
			for _, l := range lines {
				if l.Count > 0 {
					fmt.Printf("   %-28s %-8s out=%12d in=%12d n=%d\n", l.Name, l.Kind, l.Out, l.In, l.Count)
				}
			}
			for i, g := range needs {
				if i < 6 {
					fmt.Printf("   ? %s %q x%d %d\n", g.Direction, g.Party, g.Count, g.Total)
				}
			}
		}
		return
	}
	if password == "" || len(secret) < 32 {
		log.Fatal("Set APP_PASSWORD and SESSION_SECRET (at least 32 characters) in your .env file.")
	}
	dataDir := os.Getenv("DATA_DIR")
	if dataDir == "" {
		dataDir = "./data"
	}
	st, err := OpenStore(dataDir)
	if err != nil {
		log.Fatal(err)
	}

	app := fiber.New(fiber.Config{BodyLimit: 25 << 20, AppName: "Money Tracker API"})
	app.Use(recover.New(), logger.New())

	api := app.Group("/api")
	api.Get("/health", func(c *fiber.Ctx) error { return c.JSON(fiber.Map{"ok": true}) })

	api.Post("/login", func(c *fiber.Ctx) error {
		var body struct{ Password string }
		_ = c.BodyParser(&body)
		if subtle.ConstantTimeCompare([]byte(body.Password), []byte(password)) != 1 {
			time.Sleep(800 * time.Millisecond)
			return c.Status(401).JSON(fiber.Map{"error": "رمز اشتباه است."})
		}
		exp := time.Now().Add(30 * 24 * time.Hour).Unix()
		c.Cookie(&fiber.Cookie{Name: cookieName, Value: sign(exp), HTTPOnly: true, Secure: cookieSecure,
			SameSite: "Strict", Path: "/", Expires: time.Unix(exp, 0)})
		return c.JSON(fiber.Map{"ok": true})
	})
	api.Post("/logout", func(c *fiber.Ctx) error {
		c.Cookie(&fiber.Cookie{Name: cookieName, Value: "", Path: "/", Expires: time.Unix(0, 0), HTTPOnly: true})
		return c.JSON(fiber.Map{"ok": true})
	})
	api.Get("/me", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"signedIn": validSession(c.Cookies(cookieName))})
	})

	p := api.Group("", requireAuth)

	// Upload a statement PDF. New transactions are merged; repeats are skipped.
	p.Post("/upload", func(c *fiber.Ctx) error {
		fh, err := c.FormFile("file")
		if err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "یک فایل PDF صورتحساب انتخاب کنید."})
		}
		tmpDir, _ := os.MkdirTemp("", "upload")
		defer os.RemoveAll(tmpDir)
		path := filepath.Join(tmpDir, "statement.pdf")
		if err := c.SaveFile(fh, path); err != nil {
			return err
		}
		text, err := pdfToText(path)
		if err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "این فایل به‌عنوان PDF خوانده نشد."})
		}
		parsed := ParseStatement(text)
		if len(parsed) == 0 {
			return c.Status(400).JSON(fiber.Map{"error": "تراکنشی پیدا نشد. فایل PDF «گردش سپرده» رسالت را بارگذاری کنید."})
		}
		added := 0
		months := map[string]bool{}
		var debit, credit int64
		err = st.Update(func(s *State) error {
			seen := map[string]bool{}
			for _, t := range s.Transactions {
				seen[t.ID] = true
			}
			for _, t := range parsed {
				debit += t.Debit
				credit += t.Credit
				months[t.Month] = true
				if !seen[t.ID] {
					s.Transactions = append(s.Transactions, t)
					seen[t.ID] = true
					added++
				}
			}
			return nil
		})
		if err != nil {
			return err
		}
		var ms []string
		for m := range months {
			ms = append(ms, m)
		}
		sort.Strings(ms)
		return c.JSON(fiber.Map{"found": len(parsed), "added": added, "months": ms,
			"totalOutToman": toman(debit), "totalInToman": toman(credit)})
	})

	p.Get("/months", func(c *fiber.Ctx) error {
		var list []MonthSummary
		st.Read(func(s *State) {
			seen := map[string]bool{}
			for _, t := range s.Transactions {
				seen[t.Month] = true
			}
			for m := range seen {
				ms, _, _ := summarize(m, s.Transactions, s.Categories)
				list = append(list, ms)
			}
		})
		sort.Slice(list, func(i, j int) bool { return list[i].Month > list[j].Month })
		if list == nil {
			list = []MonthSummary{}
		}
		return c.JSON(list)
	})

	p.Get("/months/:ym", func(c *fiber.Ctx) error {
		ym := c.Params("ym")
		var resp fiber.Map
		st.Read(func(s *State) {
			ms, lines, groups := summarize(ym, s.Transactions, s.Categories)
			var txs []Transaction
			for _, t := range s.Transactions {
				if t.Month == ym {
					txs = append(txs, t)
				}
			}
			sort.Slice(txs, func(i, j int) bool {
				if txs[i].Date != txs[j].Date {
					return txs[i].Date > txs[j].Date
				}
				return txs[i].Time > txs[j].Time
			})
			if txs == nil {
				txs = []Transaction{}
			}
			if groups == nil {
				groups = []NeedGroup{}
			}
			resp = fiber.Map{"summary": ms, "categories": lines, "needs": groups, "transactions": txs}
		})
		return c.JSON(resp)
	})

	p.Get("/months/:ym/export.csv", func(c *fiber.Ctx) error {
		ym := c.Params("ym")
		c.Set("Content-Type", "text/csv; charset=utf-8")
		c.Set("Content-Disposition", fmt.Sprintf(`attachment; filename="money-%s.csv"`, ym))
		w := csv.NewWriter(c)
		_, _ = c.Write([]byte("\xEF\xBB\xBF")) // BOM so Excel shows Persian correctly
		_ = w.Write([]string{"date", "time", "category", "counterparty", "out_toman", "in_toman", "balance_toman", "description"})
		st.Read(func(s *State) {
			for _, t := range s.Transactions {
				if t.Month == ym {
					_ = w.Write([]string{t.Date, t.Time, t.Category, t.Party,
						strconv.FormatInt(toman(t.Debit), 10), strconv.FormatInt(toman(t.Credit), 10),
						strconv.FormatInt(toman(t.Balance), 10), t.Desc})
				}
			}
		})
		w.Flush()
		return nil
	})

	p.Delete("/months/:ym", func(c *fiber.Ctx) error {
		ym := c.Params("ym")
		return st.Update(func(s *State) error {
			kept := s.Transactions[:0]
			for _, t := range s.Transactions {
				if t.Month != ym {
					kept = append(kept, t)
				}
			}
			s.Transactions = kept
			return nil
		})
	})

	// Set one transaction's category by hand ("" removes the override).
	p.Put("/transactions/:id/category", func(c *fiber.Ctx) error {
		var body struct{ Category string }
		if err := c.BodyParser(&body); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "دسته را انتخاب کنید."})
		}
		id := c.Params("id")
		return st.Update(func(s *State) error {
			if body.Category == "" {
				delete(s.Overrides, id)
			} else {
				s.Overrides[id] = body.Category
			}
			return nil
		})
	})

	p.Get("/rules", func(c *fiber.Ctx) error {
		var r []Rule
		st.Read(func(s *State) { r = s.Rules })
		return c.JSON(r)
	})
	// Add a rule at the top so it wins over older ones.
	p.Post("/rules", func(c *fiber.Ctx) error {
		var r Rule
		if err := c.BodyParser(&r); err != nil || (r.Match == "" && r.Amount == 0) || r.Category == "" {
			return c.Status(400).JSON(fiber.Map{"error": "قانون باید یک متن (یا مبلغ) و یک دسته داشته باشد."})
		}
		if r.Direction == "" {
			r.Direction = "any"
		}
		return st.Update(func(s *State) error {
			s.Rules = append([]Rule{r}, s.Rules...)
			return nil
		})
	})
	p.Put("/rules", func(c *fiber.Ctx) error {
		var rs []Rule
		if err := c.BodyParser(&rs); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "فهرست کامل قوانین را بفرستید."})
		}
		return st.Update(func(s *State) error { s.Rules = rs; return nil })
	})

	p.Get("/categories", func(c *fiber.Ctx) error {
		var cs []Category
		st.Read(func(s *State) { cs = s.Categories })
		return c.JSON(cs)
	})
	p.Put("/categories", func(c *fiber.Ctx) error {
		var cs []Category
		if err := c.BodyParser(&cs); err != nil || len(cs) == 0 {
			return c.Status(400).JSON(fiber.Map{"error": "فهرست کامل دسته‌ها را بفرستید."})
		}
		hasNeeds := false
		for _, x := range cs {
			hasNeeds = hasNeeds || x.Name == NeedsLabel
		}
		if !hasNeeds {
			cs = append(cs, Category{NeedsLabel, "unknown", 0})
		}
		return st.Update(func(s *State) error { s.Categories = cs; return nil })
	})

	p.Get("/settings", func(c *fiber.Ctx) error {
		var se Settings
		st.Read(func(s *State) { se = s.Settings })
		return c.JSON(se)
	})
	p.Put("/settings", func(c *fiber.Ctx) error {
		var se Settings
		if err := c.BodyParser(&se); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "تنظیمات خوانده نشد."})
		}
		return st.Update(func(s *State) error { s.Settings = se; return nil })
	})

	p.Get("/goal", func(c *fiber.Ctx) error {
		var resp fiber.Map
		st.Read(func(s *State) { resp = goal(s) })
		return c.JSON(resp)
	})

	p.Get("/plan", func(c *fiber.Ctx) error {
		var pl map[string]bool
		st.Read(func(s *State) { pl = s.Plan })
		return c.JSON(pl)
	})
	p.Put("/plan", func(c *fiber.Ctx) error {
		var pl map[string]bool
		if err := c.BodyParser(&pl); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "برنامه خوانده نشد."})
		}
		return st.Update(func(s *State) error { s.Plan = pl; return nil })
	})

	addr := os.Getenv("LISTEN")
	if addr == "" {
		addr = ":8080"
	}
	log.Fatal(app.Listen(addr))
}

type GoalMonth struct {
	Month      string `json:"month"`
	Saved      int64  `json:"saved"`
	Cumulative int64  `json:"cumulative"`
	Partial    bool   `json:"partial"`
}

// goal tracks savings toward emergency fund + car down payment.
func goal(s *State) fiber.Map {
	se := s.Settings
	seen := map[string]bool{}
	for _, t := range s.Transactions {
		seen[t.Month] = true
	}
	var months []string
	for m := range seen {
		if m > se.SavingsStartMonth {
			months = append(months, m)
		}
	}
	sort.Strings(months)
	cum := se.SavingsStart
	var hist []GoalMonth
	var recent []int64
	for _, m := range months {
		ms, _, _ := summarize(m, s.Transactions, s.Categories)
		cum += ms.Saved
		partial := !strings.HasSuffix(ms.FirstDate, "/01") || ms.LastDate[8:] < "29"
		hist = append(hist, GoalMonth{Month: m, Saved: ms.Saved, Cumulative: cum, Partial: partial})
		if !partial {
			recent = append(recent, ms.Saved)
		}
	}
	if len(recent) > 3 {
		recent = recent[len(recent)-3:]
	}
	var avg int64
	for _, v := range recent {
		avg += v
	}
	if len(recent) > 0 {
		avg /= int64(len(recent))
	}
	down := se.CarPrice - se.PlannedLoan
	if down < 0 {
		down = 0
	}
	need := se.EmergencyFund + down
	remaining := need - cum
	if remaining < 0 {
		remaining = 0
	}
	pace := avg
	if pace <= 0 {
		pace = se.MonthlyTarget
	}
	var monthsLeft int64 = -1
	if pace > 0 {
		monthsLeft = (remaining + pace - 1) / pace
	}
	var targetMonths int64 = -1
	if se.MonthlyTarget > 0 {
		targetMonths = (remaining + se.MonthlyTarget - 1) / se.MonthlyTarget
	}
	if hist == nil {
		hist = []GoalMonth{}
	}
	return fiber.Map{
		"settings": se, "saved": cum, "downPayment": down, "needed": need, "remaining": remaining,
		"avgSaved": avg, "monthsAtPace": monthsLeft, "monthsAtTarget": targetMonths, "history": hist,
	}
}
