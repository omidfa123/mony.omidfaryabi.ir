package main

// Category kinds: income, spending, transfer (moved money, not counted),
// unknown (still needs a label).
type Category struct {
	Name   string `json:"name"`
	Kind   string `json:"kind"`
	Budget int64  `json:"budget"` // monthly budget in toman (spending only)
}

// Rule assigns a category when Match appears in the transaction text.
// Direction is "in", "out" or "any". Amount (rial) is optional: 0 = any.
type Rule struct {
	Match     string `json:"match"`
	Direction string `json:"direction"`
	Amount    int64  `json:"amount"`
	Category  string `json:"category"`
	Note      string `json:"note"`
}

// Settings drive own-account detection and the car goal. Money in toman.
type Settings struct {
	OwnerName         string   `json:"ownerName"`
	OwnCards          []string `json:"ownCards"`
	CarPrice          int64    `json:"carPrice"`
	PlannedLoan       int64    `json:"plannedLoan"`
	EmergencyFund     int64    `json:"emergencyFund"`
	SavingsStart      int64    `json:"savingsStart"`
	SavingsStartMonth string   `json:"savingsStartMonth"`
	MonthlyTarget     int64    `json:"monthlyTarget"`
}

const NeedsLabel = "نامشخص"

func defaultCategories() []Category {
	return []Category{
		{"حقوق", "income", 0},
		{"پاداش", "income", 0},
		{"اضافه‌کار شرکت", "income", 0},
		{"سود سرمایه‌گذاری", "income", 0},
		{"بازپرداخت خانواده", "income", 0},
		{"درآمد دیگر", "income", 0},
		{"خانواده", "spending", 10_000_000},
		{"خواربار", "spending", 10_000_000},
		{"غذای بیرون", "spending", 3_500_000},
		{"تاکسی اینترنتی", "spending", 1_500_000},
		{"رفت‌وآمد", "spending", 1_500_000},
		{"اشتراک‌ها (VPS و AI)", "spending", 5_500_000},
		{"موبایل و اینترنت", "spending", 3_000_000},
		{"پوشاک", "spending", 2_000_000},
		{"سلامت", "spending", 1_000_000},
		{"سفر", "spending", 1_000_000},
		{"قبض‌ها", "spending", 500_000},
		{"کارمزد بانک", "spending", 100_000},
		{"اقساط", "spending", 0},
		{"قسط وام", "spending", 0},
		{"انتقال به دیگران", "spending", 5_000_000},
		{"هزینه‌های دیگر", "spending", 0},
		{"حساب‌های خودم", "transfer", 0},
		{"وام برادر", "transfer", 0},
		{"رفت و برگشت", "transfer", 0},
		{NeedsLabel, "unknown", 0},
	}
}

func defaultRules() []Rule {
	r := func(m, d, c, n string) Rule { return Rule{Match: m, Direction: d, Category: c, Note: n} }
	rules := []Rule{
		r("1-1147793", "any", "وام برادر", "وام رسالت که برای برادرم می‌دهم"),
		r("5022291523239513", "in", "وام برادر", "کارت پاسارگاد برادرم"),
		r("غیورمینائی", "in", "پاداش", "پاداش سه‌ماهه"),
		r("بهمن آبادی", "in", "اضافه‌کار شرکت", ""),
		r("پویا داده پرداز", "in", "اضافه‌کار شرکت", ""),
		r("زرین ماندگار", "in", "سود سرمایه‌گذاری", ""),
		r("فاریابی", "in", "بازپرداخت خانواده", ""),
		r("میرصادقی", "out", "خواربار", "سوپرمارکت محل"),
		r("قاسمیان", "out", "خواربار", "مغازه محل"),
		r("توسعه تجارت و فناوری", "out", "خواربار", "کیف پول تارا"),
		r("12534009", "out", "خواربار", "پایانه تارا"),
		r("سنا ایمن مبادله", "out", "اشتراک‌ها (VPS و AI)", "بیت‌پین"),
		r("بیت پین", "out", "اشتراک‌ها (VPS و AI)", "بیت‌پین"),
		r("فاریابی", "out", "خانواده", ""),
		r("پورمولائی", "out", "خانواده", ""),
		r("شهبازی", "out", "پوشاک", ""),
		r("SNAPPFOOD", "out", "غذای بیرون", ""),
		r("اسنپ فود", "out", "غذای بیرون", ""),
		r("5667931", "out", "غذای بیرون", "پایانه اسنپ‌فود"),
		r("اسنپ دکتر", "out", "سلامت", ""),
		r("7078000", "out", "سلامت", "پایانه اسنپ دکتر"),
		r("تپسی", "out", "تاکسی اینترنتی", ""),
		r("6118675", "out", "تاکسی اینترنتی", "پایانه تپسی"),
		r("9573431", "out", "تاکسی اینترنتی", "پایانه تپسی"),
		r("80080727", "out", "تاکسی اینترنتی", "پایانه اسنپ"),
		r("99407171", "out", "تاکسی اینترنتی", "پایانه اسنپ"),
		r("اسنپ", "out", "تاکسی اینترنتی", ""),
		r("ستربلیط", "out", "سفر", "مستربلیط"),
		r("6624032", "out", "موبایل و اینترنت", "پایانه ایرانسل"),
		r("5381413", "out", "موبایل و اینترنت", "پایانه همراه اول"),
		r("30952742", "out", "موبایل و اینترنت", "پایانه همراه اول"),
		r("ایرانسل", "out", "موبایل و اینترنت", ""),
		r("شاتل", "out", "موبایل و اینترنت", ""),
		r("SHATEL", "out", "موبایل و اینترنت", ""),
		r("بیکام", "out", "موبایل و اینترنت", ""),
		r("BIKAM", "out", "موبایل و اینترنت", ""),
		r("همراه کسب", "out", "موبایل و اینترنت", ""),
		r("77998997", "out", "قسط وام", "وام پاسارگاد"),
		r("دیجی پی", "any", "اقساط", "دیجی‌پی"),
		r("اقساط", "out", "اقساط", ""),
		r("قبض", "out", "قبض‌ها", ""),
	}
	rules = append(rules, Rule{Match: "", Direction: "out", Amount: 900_000, Category: "رفت‌وآمد", Note: "تاکسی مسیر کار ۹۰٬۰۰۰ تومان"})
	return rules
}

func defaultSettings() Settings {
	return Settings{
		OwnerName:         "امید فاریابی",
		OwnCards:          []string{"5041721204013214", "6219861868612416"},
		CarPrice:          1_000_000_000,
		PlannedLoan:       600_000_000,
		EmergencyFund:     150_000_000,
		SavingsStart:      106_000_000,
		SavingsStartMonth: "1405-08",
		MonthlyTarget:     50_000_000,
	}
}
