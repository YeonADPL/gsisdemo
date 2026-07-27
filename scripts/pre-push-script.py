#!/usr/bin/env python3

import os
import system
import time
import requests
import shutil

from dotenv import load_dotenv
load_dotenv("../.env")

API_BASE_URL = "http://localhost/app/api/v1"
DS_API_TOKEN = os.getenv("DS_API_TOKEN")
request_headers = { "Authorization": f"Bearer {DS_API_TOKEN}", "Accept":"application/json"} 

def create_ds_project():
    print("Creating DerScanner Project")
    create_project_url = API_BASE_URL + "/projects"
    request_params = {"unique_name":"true"}
    
    form_data = {
    'applyTriage': (None, 'false'),
    'branch': (None, ''),
    'sendReportManual': (None, 'true'),
    'priority': (None, ''),
    'ruleSet': (None, ''),
    'submodules': (None, 'true'),
    'aiCritical': (None, 'false'),
    'vcsAccount': (None, ''),
    'sendReportAutoscan': (None, 'false'),
    'java_custom_build_command': (None, ''),
    'analyzeJavaSource': (None, 'true'),
    'aiTriageInfo': (None, 'false'),
    'checkboxNoBuild': (None, 'true'),
    'cfamilyOs': (None, 'WIN'),
    'name': (None, 'wwttff'),
    'ccpp_custom_build_command': (None, ''),
    'moduleLogLevel': (None, 'DEFAULT'),
    'aiLow': (None, 'false'),
    'cqLanguages': (None, ''),
    'sourceEncoding': (None, ''),
    'aiFixForTriageConfirmed': (None, 'false'),
    'sendReportTemplateUuid': (None, ''),
    'aiTriageMedium': (None, 'false'),
    'checkboxUseUserPatterns': (None, 'true'),
    'vcsToken': (None, ''),
    'groups': (None, ''),
    'dastProjectId': (None, ''),
    'aiInfo': (None, 'false'),
    'sendReportRecipients': (None, 'sendReportRecipients'),
    'preprocessing': (None, 'true'),
    'checkboxAnalyzeLibs': (None, 'true'),
    'aiTriageLow': (None, 'false'),
    'icon': (None, ''),
    'saveFile': (None, 'true'),
    'builderSettingsId': (None, ''),
    'incremental': (None, 'true'),
    'link': (None, ''),
    'languages': (None, ''),
    'sendReportToAdmins': (None, 'true'),
    'fileSelector': (None, ''),
    'aiTriageCritical': (None, 'false'),
    'aiMedium': (None, 'false'),
    'vcsSshKey': (None, ''),
    'useCtu': (None, 'true'),
    'nameEncoding': (None, ''),
    'preset': (None, '')
}
    try:
        create_ds_project_response = requests.post(url, params=request_params, headers=request_headers, files=form_data)
    except Exception as e:
        print("Error :", e)
        sys.exit(1)
    else:
        print("No Error at all")
        if (create_ds_project_response.status_code == 200):
            print("Created DerScanner Project successfully")
            return create_ds_project_response["uuid"]
        else:
            print(f"Something wrong with the project creation, response status code : {create_ds_project_response.status_code}")
            sys.exit(1)

def run_sast(projectuuid):
    print("Triggering DerScanner SAST Scan...")
    print("Project UUID: ", projectuuid)
    sast_scan_url = API_BASE_URL + "/scan/start"
    run_sast_request_headers = {
    'Accept': 'application/json',
    'Accept-Language': 'en-US,en;q=0.9',
    'Authorization': f'Bearer {token}',
    'Connection': 'keep-alive',
    'Origin': 'http://localhost',
    'Referer': 'http://localhost/projects/f14bcb83-83f6-43c9-9896-c67a56ab443f/scans/new',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin',
    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36',
    'sec-ch-ua': '"Not;A=Brand";v="8", "Chromium";v="150", "Google Chrome";v="150"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Linux"'
}

    cookies = {
        'locale': 'en'
    }
    
    # Passing a dict with (None, 'value') tuples to the 'files' parameter 
    # forces requests to send the payload as multipart/form-data
    '''form_data = {
        'uuid': (None, projectuuid),
        'link': (None, 'https://github.com/YeonADPL/gsisdemo'),
        'submodules': (None, 'true'),
        'name': (None, 'wwttff'),
        'languages': (None, 'ABAP,ANDROID,APEX,CCPP,COBOL,CONFIG,CS,DART,DELPHI,GO,GROOVY,HTML5,JAVA,JAVASCRIPT,KOTLIN,LOTUS,ONES,PASCAL,PERL,PHP,PLSQL,PYTHON,RUBY,RUST,SCALA,SOLIDITY,SWIFT,TSQL,TSX,TYPESCRIPT,VB,VBA,VBNET,VBSCRIPT,VYPER'),
        'cqLanguages': (None, 'JAVASCRIPT,TYPESCRIPT'),
        'ruleSet': (None, ''),
        'checkboxUseUserPatterns': (None, 'true'),
        'fileSelector': (None, '**/*'),
        'sourceEncoding': (None, ''),
        'nameEncoding': (None, ''),
        'checkboxAnalyzeLibs': (None, 'true'),
        'checkboxNoBuild': (None, 'true'),
        'incremental': (None, 'true'),
        'cfamilyOs': (None, 'NIX'),
        'saveFile': (None, 'true'),
        'preprocessing': (None, 'true'),
        'sendReportTemplateUuid': (None, 'e79c4b6f-b1bf-4fb7-99bc-0916c1d27e39'),
        'sendReportManual': (None, 'true'),
        'sendReportAutoscan': (None, 'false'),
        'sendReportRecipients': (None, 'sendReportRecipients'),
        'sendReportToAdmins': (None, 'true'),
        'analyzeJavaSource': (None, 'false'),
        'priority': (None, '4'),
        'useCtu': (None, 'false'),
        'moduleLogLevel': (None, 'DEFAULT'),
        'aiCritical': (None, 'false'),
        'aiMedium': (None, 'false'),
        'aiLow': (None, 'false'),
        'aiInfo': (None, 'false'),
        'aiTriageCritical': (None, 'false'),
        'aiTriageMedium': (None, 'false'),
        'aiTriageLow': (None, 'false'),
        'aiTriageInfo': (None, 'false'),
        'applyTriage': (None, 'false'),
        'aiFixForTriageConfirmed': (None, 'false'),
        'saveRepoCredentials': (None, 'false')
    }
    '''
    # Regular form fields
    data = {
        'uuid': projectuuid,
        'submodules': 'false',
        'name': 'testAPICreateProject1',
        'languages': 'ABAP,ANDROID,APEX,CCPP,COBOL,CONFIG,CS,DART,DELPHI,GO,GROOVY,HTML5,JAVA,JAVASCRIPT,KOTLIN,LOTUS,ONES,PASCAL,PERL,PHP,PLSQL,PYTHON,RUBY,RUST,SCALA,SOLIDITY,SWIFT,TSQL,TSX,TYPESCRIPT,VB,VBA,VBNET,VBSCRIPT,VYPER',
        'cqLanguages': 'JAVASCRIPT,TYPESCRIPT',
        'ruleSet': '',
        'checkboxUseUserPatterns': 'true',
        'fileSelector': '**/*',
        'sourceEncoding': '',
        'nameEncoding': '',
        'checkboxAnalyzeLibs': 'true',
        'checkboxNoBuild': 'true',
        'incremental': 'true',
        'cfamilyOs': 'NIX',
        'saveFile': 'true',
        'preprocessing': 'true',
        'sendReportTemplateUuid': 'e79c4b6f-b1bf-4fb7-99bc-0916c1d27e39',
        'sendReportManual': 'true',
        'sendReportAutoscan': 'false',
        'sendReportRecipients': 'sendReportRecipients',
        'sendReportToAdmins': 'true',
        'analyzeJavaSource': 'true',
        'priority': '4',
        'useCtu': 'true',
        'moduleLogLevel': 'DEFAULT',
        'aiCritical': 'false',
        'aiMedium': 'false',
        'aiLow': 'false',
        'aiInfo': 'false',
        'aiTriageCritical': 'false',
        'aiTriageMedium': 'false',
        'aiTriageLow': 'false',
        'aiTriageInfo': 'false',
        'applyTriage': 'false',
        'aiFixForTriageConfirmed': 'false',
        'saveRepoCredentials': 'false'
    }
    
    scannedProject = '../../testGL'
    zip_name = 'scanned'
    zip_path = shutil.make_archive(base_name=zip_name, format='zip', root_dir=scannedProject)
    zip_filename = zip_name + '.zip'

    # Open the ZIP file in binary read mode ('rb')
    # Format: 'form_field_name': ('filename', file_object, 'content_type')
    with open(zip_filename, 'rb') as f:
        files = {
            'file': (zip_filename, f, 'application/zip')
        }
        
        # Execute the request inside the 'with' block so the file remains open while uploading
        response = requests.post(
            sast_scan_url, 
            headers=request_headers, 
            #cookies=cookies, 
            data=data, 
            files=files
        )
