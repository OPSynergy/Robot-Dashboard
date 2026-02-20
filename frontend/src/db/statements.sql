CREATE TABLE IF NOT EXISTS users (
    name TEXT NOT NULL,
    emp_id INTEGER PRIMARY KEY,
    role TEXT NOT NULL,
    passcode INTEGER NOT NULL
    )

INSERT INTO users (name, emp_id, role, passcode) VALUES ('Omprakash', 1234, 'Administrator',5678);