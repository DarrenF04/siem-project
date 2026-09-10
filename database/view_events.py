import sqlite3
from pathlib import Path


project_dir = Path(__file__).resolve().parent.parent
db_file = project_dir / "database" / "siem.db"


connection = sqlite3.connect(db_file)
cursor = connection.cursor()

cursor.execute("SELECT * FROM security_events")

events = cursor.fetchall()

for event in events:
    print(event)

connection.close()