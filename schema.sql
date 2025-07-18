
CREATE SCHEMA bbb_schema AUTHORIZATION bbb_user;

CREATE TABLE session_urls(

    id SERIAL PRIMARY KEY,
    link VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL

);


GRANT USAGE ON  SCHEMA bbb_schema TO bbb_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA bbb_schema TO bbb_user;