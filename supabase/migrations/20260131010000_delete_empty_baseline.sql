-- Delete the empty "Baseline" scenario that has no data
DELETE FROM scenarios
WHERE scenario_id = '16d18b96-b701-4950-8995-96e3c5af3612'
  AND name = 'Baseline';
