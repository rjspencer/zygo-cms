-- 1. Add the column for storing plain text representation
ALTER TABLE entries ADD COLUMN search_text TEXT;

-- 2. Backfill the initial seeds if they exist
UPDATE entries SET search_text = 'Hello Welcome to Zygo CMS.' WHERE slug = 'hello-world';
UPDATE entries SET search_text = 'About This is a static page powered by Zygo CMS.' WHERE slug = 'about';

-- 3. Create the FTS5 virtual table
CREATE VIRTUAL TABLE search_index USING fts5(
    title,
    description,
    content,
    content='entries',
    content_rowid='id',
    tokenize='porter unicode61'
);

-- 4. Create triggers to keep search_index in sync with entries
CREATE TRIGGER entries_ai AFTER INSERT ON entries BEGIN
    INSERT INTO search_index(rowid, title, description, content) 
    VALUES (new.id, new.title, new.description, new.search_text);
END;

CREATE TRIGGER entries_ad AFTER DELETE ON entries BEGIN
    INSERT INTO search_index(search_index, rowid, title, description, content) 
    VALUES ('delete', old.id, old.title, old.description, old.search_text);
END;

CREATE TRIGGER entries_au AFTER UPDATE ON entries BEGIN
    INSERT INTO search_index(search_index, rowid, title, description, content) 
    VALUES ('delete', old.id, old.title, old.description, old.search_text);
    INSERT INTO search_index(rowid, title, description, content) 
    VALUES (new.id, new.title, new.description, new.search_text);
END;
