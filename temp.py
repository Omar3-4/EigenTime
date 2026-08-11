import json
with open(r'H:\Projects\EigenTime\Reports\EigenTime report - Sonar cube cloud.txt', 'r', encoding='utf-8') as f:
    data = json.load(f)

for issue in data.get('issues', []):
    if issue.get('rule') in ('typescript:S3776', 'typescript:S3358'):
        print(f\"{issue['rule']} - {issue['component']} - line {issue['line']}\")
