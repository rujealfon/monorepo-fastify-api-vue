#!/bin/sh
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
  SELECT 'CREATE DATABASE fastify_test' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'fastify_test')\gexec
EOSQL
