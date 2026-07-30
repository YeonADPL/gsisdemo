#!/usr/bin/env python3

import os
import sys
import requests
from dotenv import load_dotenv
from requests.exceptions import HTTPError

load_dotenv()

check_URL = os.getenv("API_V1_URL")
scanUUID = os.getenv("SAST_SCAN_UUID")
DS_API_TOKEN = os.getenv("TOKEN")
check_compact_scan_url = check_URL + f"/scans/{scanUUID}/compact"

request_headers = {
    "Authorization": f"Bearer {DS_API_TOKEN}",
    "Accept": "application/json",
}
print("Getting Compact Scan Result...")
try:
    compact_scan_request = requests.get(check_compact_scan_url, headers=request_headers)
    compact_scan_request.raise_for_status()
    result = compact_scan_request.json()
    critical = result["critical"]
    medium = result["medium"]
    print(f"Critical Vunerabilities: {critical}, Medium Vunerabilities: {medium}")
    if critical > 0 or medium > 0:
        print("There are serious vulnerabilities")
        sys.exit(1)
    else:
        print("Congratulations ! No Serious Vunerability !!!")
        sys.exit(0)
except HTTPError as httperror:
    print("Check Compact Scan HTTP Error: ", httperror)
except Exception as e:
    print("Check Compact Scan Exception : ", e)
