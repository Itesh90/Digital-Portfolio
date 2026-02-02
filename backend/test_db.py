"""Test Supabase database connection."""
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def test_connection():
    # Load from .env
    from dotenv import load_dotenv
    import os
    
    load_dotenv()
    
    database_url = os.getenv("DATABASE_URL")
    print(f"Testing connection to: {database_url[:50]}...")
    
    try:
        engine = create_async_engine(database_url, echo=True)
        
        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT 1 as test"))
            row = result.fetchone()
            print(f"\n✅ SUCCESS! Database connected. Test query returned: {row}")
            
        await engine.dispose()
        
    except Exception as e:
        print(f"\n❌ FAILED! Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_connection())
