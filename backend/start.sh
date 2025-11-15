#!/bin/bash

# Navigate to the backend directory
cd /home/esadev/Repositories/sonsuz-turkiye/backend

# Activate the virtual environment
source venv/bin/activate

# Start the backend server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8049