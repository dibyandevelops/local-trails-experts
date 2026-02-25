#!/bin/bash

# Database setup script for Guided Trails
# This script helps set up the PostgreSQL database

DB_NAME=${DB_NAME:-mtb_trail_finder}
DB_USER=${DB_USER:-postgres}
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}

echo "Setting up database: $DB_NAME"
echo "User: $DB_USER"
echo "Host: $DB_HOST:$DB_PORT"
echo ""

# Check if database exists
if psql -h $DB_HOST -p $DB_PORT -U $DB_USER -lqt | cut -d \| -f 1 | grep -qw $DB_NAME; then
    echo "Database $DB_NAME already exists."
    read -p "Do you want to drop and recreate it? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Dropping database $DB_NAME..."
        psql -h $DB_HOST -p $DB_PORT -U $DB_USER -c "DROP DATABASE $DB_NAME;"
        echo "Creating database $DB_NAME..."
        psql -h $DB_HOST -p $DB_PORT -U $DB_USER -c "CREATE DATABASE $DB_NAME;"
    else
        echo "Keeping existing database."
    fi
else
    echo "Creating database $DB_NAME..."
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -c "CREATE DATABASE $DB_NAME;"
fi

echo ""
echo "Running migrations..."
npm run db:migrate

echo ""
echo "Database setup complete!"
echo "You can now start the development server with: npm run dev"

