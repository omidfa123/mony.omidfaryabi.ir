package main

import (
	"regexp"
	"sort"
	"strconv"
	"strings"
)

var (
	beneficiaryRe = regexp.MustCompile(`ذینفع\s*(.+?)\s*\d+\s*برداشت`)
	requesterRe   = regexp.MustCompile(`به درخواست\s*(.+?)\s*با شماره`)
	byRe          = regexp.MustCompile(`توسط\s*(.+?)\s*-`)
	merchantRe    = regexp.MustCompile(`(\d+)\s*پذیرنده\s*(.+?)\s*-`)
	cardRe        = regexp.MustCompile(`کارت\s*(\d{16})`)
	ownerOfRe     = regexp.MustCompile(`متعلق به\s*(.+?)\s*(?:\)|\(|از اینترنت)`)
)

// counterparty finds who the money went to or came from, plus the most
// specific text a rule can match on (a terminal number, a card or a name).
func counterparty(d string, own map[string]bool) (party, match string) {
	if m := beneficiaryRe.FindStringSubmatch(d); m != nil {
		return m[1], m[1]
	}
	if m := requesterRe.FindStringSubmatch(d); m != nil {
		return m[1], m[1]
	}
	if m := byRe.FindStringSubmatch(d); m != nil {
		return m[1], m[1]
	}
	if strings.Contains(d, "خرید") {
		if m := merchantRe.FindStringSubmatch(d); m != nil {
			return m[2] + " #" + m[1], m[1]
		}
		return "پرداخت اینترنتی", ""
	}
	if strings.HasPrefix(d, "انتقال از کارت") || strings.Contains(d, "انتقال از کارت") {
		cards := cardRe.FindAllStringSubmatch(d, -1)
		names := ownerOfRe.FindAllStringSubmatch(d, -1)
		if len(cards) >= 2 && own[cards[0][1]] {
			if len(names) >= 2 {
				return names[1][1], names[1][1]
			}
			return "کارت " + cards[1][1], cards[1][1]
		}
		if len(cards) >= 1 {
			return "کارت " + cards[0][1], cards[0][1]
		}
	}
	return "", ""
}

func direction(t *Transaction) string {
	if t.Credit > 0 {
		return "in"
	}
	return "out"
}

func amount(t *Transaction) int64 {
	if t.Credit > 0 {
		return t.Credit
	}
	return t.Debit
}

func dayNum(date string) int {
	p := strings.Split(date, "/")
	if len(p) != 3 {
		return 0
	}
	y, _ := strconv.Atoi(p[0])
	m, _ := strconv.Atoi(p[1])
	d, _ := strconv.Atoi(p[2])
	return y*372 + m*31 + d
}

// Categorize assigns every transaction a category, in this order:
// manual override, built-ins (salary, fees, own accounts), user rules,
// round-trips, then "نامشخص".
func Categorize(txs []Transaction, s Settings, rules []Rule, overrides map[string]string) {
	own := map[string]bool{}
	for _, c := range s.OwnCards {
		own[strings.TrimSpace(c)] = true
	}
	for i := range txs {
		t := &txs[i]
		t.Party, t.Match = counterparty(t.Desc, own)
		dir := direction(t)
		text := t.Desc
		if s.OwnerName != "" {
			text = strings.ReplaceAll(text, s.OwnerName, " ")
		}
		switch {
		case overrides[t.ID] != "":
			t.Category, t.Source = overrides[t.ID], "override"
		case strings.Contains(t.Desc, "حقوق") && strings.Contains(t.Desc, "سند فایلی"):
			t.Category, t.Source = "حقوق", "builtin"
		case strings.Contains(t.Desc, "کارمزد"):
			t.Category, t.Source = "کارمزد بانک", "builtin"
		case isOwnTransfer(t.Desc, s, own):
			t.Category, t.Source = "حساب‌های خودم", "builtin"
		default:
			t.Category, t.Source = NeedsLabel, "none"
			for _, r := range rules {
				if r.Direction != "any" && r.Direction != "" && r.Direction != dir {
					continue
				}
				if r.Amount != 0 && r.Amount != amount(t) {
					continue
				}
				if r.Match != "" && !strings.Contains(text, r.Match) {
					continue
				}
				if r.Match == "" && r.Amount == 0 {
					continue
				}
				t.Category, t.Source = r.Category, "rule"
				break
			}
		}
	}
	// Money sent to someone and returned by them within 3 days.
	for i := range txs {
		a := &txs[i]
		if a.Source != "none" || a.Debit == 0 || a.Party == "" {
			continue
		}
		for j := range txs {
			b := &txs[j]
			if b.Source == "none" && b.Credit == a.Debit && b.Party == a.Party &&
				abs(dayNum(a.Date)-dayNum(b.Date)) <= 3 {
				a.Category, a.Source = "رفت و برگشت", "auto"
				b.Category, b.Source = "رفت و برگشت", "auto"
				break
			}
		}
	}
}

func isOwnTransfer(d string, s Settings, own map[string]bool) bool {
	cards := cardRe.FindAllStringSubmatch(d, -1)
	if len(cards) >= 2 && own[cards[0][1]] && own[cards[1][1]] {
		return true
	}
	if s.OwnerName != "" {
		if m := beneficiaryRe.FindStringSubmatch(d); m != nil && strings.TrimSpace(m[1]) == s.OwnerName {
			return true
		}
		if len(cards) >= 2 && own[cards[0][1]] {
			names := ownerOfRe.FindAllStringSubmatch(d, -1)
			if len(names) >= 2 && strings.TrimSpace(names[1][1]) == s.OwnerName {
				return true
			}
		}
	}
	return false
}

func abs(x int) int {
	if x < 0 {
		return -x
	}
	return x
}

// ---- summaries ----

type CatLine struct {
	Name   string `json:"name"`
	Kind   string `json:"kind"`
	Budget int64  `json:"budget"`
	In     int64  `json:"in"`  // toman
	Out    int64  `json:"out"` // toman
	Net    int64  `json:"net"` // toman: spending = out-in, income = in-out
	Count  int    `json:"count"`
}

type NeedGroup struct {
	Party     string `json:"party"`
	Match     string `json:"match"`
	Direction string `json:"direction"`
	Count     int    `json:"count"`
	Total     int64  `json:"total"` // toman
	Sample    string `json:"sample"`
	Amounts   []int64 `json:"amounts"`
}

type MonthSummary struct {
	Month        string `json:"month"`
	FirstDate    string `json:"firstDate"`
	LastDate     string `json:"lastDate"`
	Count        int    `json:"count"`
	Income       int64  `json:"income"`
	Spending     int64  `json:"spending"`
	UnlabeledIn  int64  `json:"unlabeledIn"`
	UnlabeledOut int64  `json:"unlabeledOut"`
	Saved        int64  `json:"saved"`
	NeedsLabel   int    `json:"needsLabel"`
	Opening      int64  `json:"opening"`
	Closing      int64  `json:"closing"`
}

func toman(rial int64) int64 { return rial / 10 }

func summarize(month string, txs []Transaction, cats []Category) (MonthSummary, []CatLine, []NeedGroup) {
	kind := map[string]string{}
	budget := map[string]int64{}
	order := map[string]int{}
	for i, c := range cats {
		kind[c.Name], budget[c.Name], order[c.Name] = c.Kind, c.Budget, i
	}
	lines := map[string]*CatLine{}
	groups := map[string]*NeedGroup{}
	ms := MonthSummary{Month: month}
	var sorted []Transaction
	for _, t := range txs {
		if t.Month == month {
			sorted = append(sorted, t)
		}
	}
	sort.SliceStable(sorted, func(i, j int) bool {
		if sorted[i].Date != sorted[j].Date {
			return sorted[i].Date < sorted[j].Date
		}
		return sorted[i].Time < sorted[j].Time
	})
	for i, t := range sorted {
		if i == 0 {
			ms.FirstDate = t.Date
			ms.Opening = toman(t.Balance - t.Credit + t.Debit)
		}
		ms.LastDate = t.Date
		ms.Closing = toman(t.Balance)
		ms.Count++
		k := kind[t.Category]
		if k == "" {
			k = "spending"
		}
		l := lines[t.Category]
		if l == nil {
			l = &CatLine{Name: t.Category, Kind: k, Budget: budget[t.Category]}
			lines[t.Category] = l
		}
		l.In += toman(t.Credit)
		l.Out += toman(t.Debit)
		l.Count++
		if t.Category == NeedsLabel {
			ms.NeedsLabel++
			key := direction(&t) + "|" + t.Party
			g := groups[key]
			if g == nil {
				g = &NeedGroup{Party: t.Party, Match: t.Match, Direction: direction(&t), Sample: t.Desc}
				groups[key] = g
			}
			g.Count++
			g.Total += toman(amount(&t))
			if len(g.Amounts) < 8 {
				g.Amounts = append(g.Amounts, toman(amount(&t)))
			}
		}
	}
	var out []CatLine
	for _, l := range lines {
		switch l.Kind {
		case "income":
			l.Net = l.In - l.Out
			ms.Income += l.Net
		case "spending":
			l.Net = l.Out - l.In
			ms.Spending += l.Net
		case "unknown":
			ms.UnlabeledIn += l.In
			ms.UnlabeledOut += l.Out
			l.Net = l.Out - l.In
		default:
			l.Net = l.Out - l.In
		}
		out = append(out, *l)
	}
	// budgeted categories with nothing spent still show up
	for _, c := range cats {
		if c.Kind == "spending" && c.Budget > 0 && lines[c.Name] == nil {
			out = append(out, CatLine{Name: c.Name, Kind: c.Kind, Budget: c.Budget})
		}
	}
	sort.SliceStable(out, func(i, j int) bool { return order[out[i].Name] < order[out[j].Name] })
	ms.Saved = ms.Income - ms.Spending - ms.UnlabeledOut
	var gs []NeedGroup
	for _, g := range groups {
		gs = append(gs, *g)
	}
	sort.Slice(gs, func(i, j int) bool { return gs[i].Total > gs[j].Total })
	return ms, out, gs
}
