package main

import (
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"sync"
)

// State is everything the app keeps. It lives in one JSON file on the
// data volume and is rewritten atomically on every change.
type State struct {
	Settings     Settings          `json:"settings"`
	Categories   []Category        `json:"categories"`
	Rules        []Rule            `json:"rules"`
	Overrides    map[string]string `json:"overrides"`
	Plan         map[string]bool   `json:"plan"`
	Transactions []Transaction     `json:"transactions"`
}

type Store struct {
	mu   sync.RWMutex
	path string
	s    State
}

func OpenStore(dir string) (*Store, error) {
	if err := os.MkdirAll(dir, 0o700); err != nil {
		return nil, err
	}
	st := &Store{path: filepath.Join(dir, "state.json")}
	b, err := os.ReadFile(st.path)
	switch {
	case errors.Is(err, os.ErrNotExist):
		st.s = State{Settings: defaultSettings(), Categories: defaultCategories(), Rules: defaultRules()}
	case err != nil:
		return nil, err
	default:
		if err := json.Unmarshal(b, &st.s); err != nil {
			return nil, err
		}
	}
	if st.s.Overrides == nil {
		st.s.Overrides = map[string]string{}
	}
	if st.s.Plan == nil {
		st.s.Plan = map[string]bool{}
	}
	return st, st.saveLocked()
}

func (st *Store) saveLocked() error {
	b, err := json.Marshal(st.s)
	if err != nil {
		return err
	}
	tmp := st.path + ".tmp"
	if err := os.WriteFile(tmp, b, 0o600); err != nil {
		return err
	}
	return os.Rename(tmp, st.path)
}

func (st *Store) recategorizeLocked() {
	Categorize(st.s.Transactions, st.s.Settings, st.s.Rules, st.s.Overrides)
}

// Read gives fn a consistent view of the state.
func (st *Store) Read(fn func(s *State)) {
	st.mu.RLock()
	defer st.mu.RUnlock()
	fn(&st.s)
}

// Update changes the state, re-runs categorization and saves.
func (st *Store) Update(fn func(s *State) error) error {
	st.mu.Lock()
	defer st.mu.Unlock()
	if err := fn(&st.s); err != nil {
		return err
	}
	st.recategorizeLocked()
	return st.saveLocked()
}
