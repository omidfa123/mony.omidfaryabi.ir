package main

import (
	"crypto/sha1"
	"encoding/hex"
	"fmt"
	"os/exec"
	"regexp"
	"strconv"
	"strings"
)

// Transaction is one row of a bank statement. Amounts are in rial.
type Transaction struct {
	ID       string `json:"id"`
	Date     string `json:"date"`  // 1405/08/11
	Time     string `json:"time"`  // 14:22:43
	Month    string `json:"month"` // 1405-08
	Debit    int64  `json:"debit"`
	Credit   int64  `json:"credit"`
	Balance  int64  `json:"balance"`
	Desc     string `json:"desc"`
	Party    string `json:"party"`
	Match    string `json:"match"` // text a rule can use to catch this counterparty
	Category string `json:"category"`
	Source   string `json:"source"` // override | builtin | rule | auto | none
}

var (
	rowRe   = regexp.MustCompile(`(\d\d:\d\d:\d\d)\s+(\d{4}/\d\d/\d\d)\s+(?:(\S+)\s+)?(\d+)\s*$`)
	amtRe   = regexp.MustCompile(`^\s*([\d,]+)\s+([\d,]+)\s+([\d,]+)\s+(.*)$`)
	docRe   = regexp.MustCompile(`\b\d{11}\s+\d{11}\b`)
	digitRe = regexp.MustCompile(`^[\d\s]+$`)
	skipRe  = regexp.MustCompile(`بانک قرض|صورت حساب|صورتحساب|یادداشت|صفحه`)
	spaceRe = regexp.MustCompile(`\s+`)
	bidiRe  = regexp.MustCompile("[\u200e\u200f\u202a-\u202e]")
)

// normalize turns PDF presentation-form Persian into normal text.
func normalize(s string) string {
	var b strings.Builder
	for _, r := range s {
		if m, ok := arabicForms[r]; ok {
			b.WriteString(m)
			continue
		}
		b.WriteRune(r)
	}
	out := bidiRe.ReplaceAllString(b.String(), "")
	out = strings.ReplaceAll(out, "ي", "ی")
	out = strings.ReplaceAll(out, "ك", "ک")
	return out
}

// pdfToText runs poppler's pdftotext in layout mode.
func pdfToText(path string) (string, error) {
	cmd := exec.Command("pdftotext", "-layout", path, "-")
	var stderr strings.Builder
	cmd.Stderr = &stderr
	b, err := cmd.Output()
	if err != nil {
		return "", fmt.Errorf("pdftotext failed: %v %s", err, stderr.String())
	}
	return string(b), nil
}

func parseAmount(s string) int64 {
	v, _ := strconv.ParseInt(strings.ReplaceAll(s, ",", ""), 10, 64)
	return v
}

func txID(date, tm string, debit, credit, balance int64) string {
	h := sha1.Sum([]byte(fmt.Sprintf("%s|%s|%d|%d|%d", date, tm, debit, credit, balance)))
	return hex.EncodeToString(h[:8])
}

// ParseStatement reads a Resalat Bank "صورت حساب سپرده" text dump.
// Each transaction ends on the line that carries time, date and row number;
// the amounts line (balance, credit, debit) is somewhere in the block before it.
func ParseStatement(text string) []Transaction {
	var txs []Transaction
	var block []string
	for _, raw := range strings.Split(text, "\n") {
		l := normalize(strings.TrimRight(raw, " \r"))
		if strings.TrimSpace(l) == "" {
			continue
		}
		block = append(block, l)
		m := rowRe.FindStringSubmatch(l)
		if m == nil {
			continue
		}
		var amt []string
		var desc []string
		for _, b := range block {
			b2 := rowRe.ReplaceAllString(b, "")
			b2 = docRe.ReplaceAllString(b2, "")
			if a := amtRe.FindStringSubmatch(b2); a != nil && amt == nil {
				amt = a[1:4]
				b2 = a[4]
			}
			if skipRe.MatchString(b2) && amt == nil {
				continue
			}
			b2 = strings.TrimSpace(strings.ReplaceAll(b2, "1-1405-10-IRR-", ""))
			if b2 != "" && !digitRe.MatchString(b2) {
				desc = append(desc, b2)
			}
		}
		block = nil
		if amt == nil {
			continue
		}
		bal, cr, dr := parseAmount(amt[0]), parseAmount(amt[1]), parseAmount(amt[2])
		d := spaceRe.ReplaceAllString(strings.Join(desc, " "), " ")
		date, tm := m[2], m[1]
		txs = append(txs, Transaction{
			ID: txID(date, tm, dr, cr, bal), Date: date, Time: tm,
			Month: strings.ReplaceAll(date[:7], "/", "-"),
			Debit: dr, Credit: cr, Balance: bal, Desc: strings.TrimSpace(d),
		})
	}
	return txs
}
