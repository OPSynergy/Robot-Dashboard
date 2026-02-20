CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    emp_id INTEGER ,
    role TEXT NOT NULL,
    passcode INTEGER NOT NULL
    )

INSERT INTO users (name, emp_id, role, passcode) VALUES ('Chanchal',4321, 'Operator',8765);

SELECT * FROM users;

DROP TABLE users WHERE emp_id = 1234;

SELECT * FROM users WHERE emp_id = '1234';

UPDATE users SET role = 'Admin' WHERE emp_id = 1234;

DELETE FROM users WHERE emp_id = 1234;

