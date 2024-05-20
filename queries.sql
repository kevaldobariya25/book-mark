DROP TABLE IF EXISTS books;

CREATE TABLE books(
	id SERIAL PRIMARY KEY,
	isbn TEXT,
	title TEXT,
	author TEXT,
	cover TEXT,
	review TEXT,
	publication_date TEXT,
	rating INTEGER
);