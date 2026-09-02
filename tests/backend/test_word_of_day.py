"""Unit tests for Word-of-Day rotation and entry validity."""

from datetime import date

from app.services.word_of_day import ENTRY_COUNT, entry_for_date


def test_same_date_returns_same_entry() -> None:
    assert entry_for_date(date(2024, 1, 1)) == entry_for_date(date(2024, 1, 1))


def test_consecutive_dates_differ() -> None:
    assert (
        entry_for_date(date(2024, 1, 1)).expression != entry_for_date(date(2024, 1, 2)).expression
    )


def test_rotation_wraps_around() -> None:
    first = entry_for_date(date(2024, 1, 1))
    after_cycle = entry_for_date(date.fromordinal(date(2024, 1, 1).toordinal() + ENTRY_COUNT))
    assert first.expression == after_cycle.expression
    assert first.definition == after_cycle.definition


def test_every_entry_is_valid() -> None:
    for i in range(ENTRY_COUNT):
        entry = entry_for_date(date.fromordinal(i + 1))
        assert entry.expression
        assert entry.ipa.startswith("/")
        assert entry.register_tag
        assert entry.definition
        assert len(entry.examples) == 2
        assert entry.kind in {"idiom", "phrasal_verb", "collocation"}
