#!/bin/bash
set -e

# Check if essential environment variables are set
if [[ -z "$POSTGRES_USER" || -z "$POSTGRES_DB" ]]; then
  echo "Error: POSTGRES_USER and POSTGRES_DB must be set"
  exit 1
fi

# Create the PostGIS extension
echo "Creating PostGIS extensions in database $POSTGRES_DB..."

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
  -- Enable PostGIS extension for geospatial support
  CREATE EXTENSION IF NOT EXISTS postgis;

  -- Optional: Enable Tiger Geocoder extension for geocoding capabilities
  CREATE EXTENSION IF NOT EXISTS postgis_tiger_geocoder;

  -- Optional: Enable PostGIS topology extension for advanced topology support
  CREATE EXTENSION IF NOT EXISTS postgis_topology;
EOSQL

echo "PostGIS extensions created successfully."
