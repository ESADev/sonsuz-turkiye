#!/bin/bash

# Start the backend in a new xfce4-terminal window
xfce4-terminal --hold -e "/home/esadev/Repositories/sonsuz-turkiye/backend/start.sh" &

# Start the frontend in a new xfce4-terminal window
xfce4-terminal --hold -e "/home/esadev/Repositories/sonsuz-turkiye/frontend/start.sh" &