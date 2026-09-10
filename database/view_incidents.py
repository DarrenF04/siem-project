import sqlite3
from database.db import db_file


connection = sqlite3.connect(db_file)
cursor = connection.cursor()

cursor.execute("""
    SELECT
        id,
        timestamp,
        incident_type,
        source_ip,
        failed_logins,
        successful_login,
        command_executions,
        risk_score,
        severity,
        message
    FROM security_incidents
    ORDER BY id
""")

incidents = cursor.fetchall()

for incident in incidents:
    print(incident)

connection.close()