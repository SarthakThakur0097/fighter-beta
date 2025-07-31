import sqlite3
import pandas as pd

# Connect to the SQLite database
conn = sqlite3.connect("mma_fighters.db")

def get_fighter_data(fighter_name):
    query = '''
    SELECT f.*, fh.* 
    FROM fighters f
    LEFT JOIN fights fh ON f.id = fh.fighter_id
    WHERE f.name = ?
    '''
    result_df = pd.read_sql_query(query, conn, params=(fighter_name,))
    return result_df

# Example usage
fighter_name = "Jon Jones"
fighter_data = get_fighter_data(fighter_name)

print(fighter_data)
# Close the database connection
conn.close()
