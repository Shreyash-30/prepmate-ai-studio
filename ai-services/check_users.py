#!/usr/bin/env python3

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os
from pathlib import Path

async def check_users():
    env_path = Path('.env')
    load_dotenv(env_path)
    mongo_uri = os.getenv('MONGO_URI')
    client = AsyncIOMotorClient(mongo_uri)
    db = client['prepmate-ai-studio']
    users = await db['users'].find({}).limit(5).to_list(5)
    print('Available users:')
    for u in users:
        email = u.get('email', u.get('_id'))
        user_id = u.get('_id')
        print(f'  - {email} (ID: {user_id})')
    client.close()

asyncio.run(check_users())
