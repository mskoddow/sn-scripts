class AtfUtils {}

/**
 * This static method performs all ACL tests that are described via an Excel file 
 * attached to the referenced ATF test record.
 * 
 * @param {String} strAtfRecordSysID
 * Sys ID of the ATF record that contains the Excel file with all test scenarios
 * 
 * @param {String} strRecordInsertStepSysID
 * The Sys ID of the test step that creates the record for which all 
 * test scenarios should be conducted.
 * 
 * @returns 
 * {void}
 * 
 * @author 
 * Maik Skoddow
 */
AtfUtils.performAclTests = 
	function(
		strRecordInsertStepSysID,
		strAtfRecordSysID
	) {
		if (
			typeof strRecordInsertStepSysID !== 'string' ||
			!GlideStringUtil.isEligibleSysID(strRecordInsertStepSysID)
		) {
			stepResult.setOutputMessage(
				`Value of parameter "strRecordInsertStepSysID" ` +
				`does not represent a valid Sys ID!`
			);
			stepResult.setFailed();
			return;
		}

		if (
			typeof strAtfRecordSysID !== 'string' ||
			!GlideStringUtil.isEligibleSysID(strAtfRecordSysID)
		) {
			stepResult.setOutputMessage(
				`Value of parameter "strAtfRecordSysID" ` +
				`does not represent a valid Sys ID!`
			);			
			stepResult.setFailed();
			return;
		}


		try {
			// Query for the Excel attachment (.xlsx) associated with the ATF test record
			const _grAttachment = new GlideRecord('sys_attachment');
			
			_grAttachment.addQuery('table_name', 'sys_atf_test');
			_grAttachment.addQuery('table_sys_id', strAtfRecordSysID);
			_grAttachment.addQuery('file_name', 'ENDSWITH', '.xlsx');
			_grAttachment.setLimit(1);
			_grAttachment.query();
			
			// Validate that an Excel file was found; if not, fail the test step with an error message
			if (
				!_grAttachment.next()
			) {
				stepResult.setOutputMessage(
					`Could not find any Excel file attached to the record with ` +
					`Sys ID = "${strAtfRecordSysID}" in table "sys_atf_test"!`
				);	
				stepResult.setFailed();
				return;			
			}


			// Retrieve the Excel file content stream and parse it using ServiceNow's GlideExcelParser
			const _objGSA              = new GlideSysAttachment();
			const _objAttachmentStream = _objGSA.getContentStream(_grAttachment.getUniqueValue());
			const _objExcelParser      = new sn_impex.GlideExcelParser();

			_objExcelParser.parse(_objAttachmentStream);

			// Extract the first 3 column headers from the Excel file (Description, Test, Assertion)
			const _arrHeaders   = _objExcelParser.getColumnHeaders().slice(0, 3);
			const _arrTestCases = [];

			// Iterate through each row in the Excel file and convert cell values to appropriate data types
			while (_objExcelParser.next()) {
				const _objExcelRow = _objExcelParser.getRow();

				// Map each row to an object with headers as keys and parsed cell values
				const _objTestCase =
					_arrHeaders.reduce(
						(objResult, strHeader) => {
							// Normalize string values: convert "true"/"false" strings to boolean values
							const _strCellValueToLower = 
								String(_objExcelRow[strHeader] || '').trim().toLowerCase();
							
							objResult[strHeader] = 
								_strCellValueToLower === "true" ? 
								true : 
								_strCellValueToLower === "false" ? 
									false : 
									_objExcelRow[strHeader];
							
							return objResult;
						}, 
						{}
					);


				// test if all keys in the row object have an existing string value
				const _isValid = 
					Object.keys(_objTestCase)
					.map(_strKey => _objTestCase[_strKey])
					.every(_strValue => JSUtil.notNil(_strValue));

				if (
					_isValid
				) {
					_arrTestCases.push(_objTestCase);
				}
			}


			if (
				_arrTestCases.length === 0
			) {
				stepResult.setOutputMessage(
					`Excel file "${_grAttachment.getValue('file_name')}" does ` +
					`not contain any test cases!`
				);	
				stepResult.setFailed();
				return;			
			}


			// try to receive the ATF step that creates the record, we 
			//  want to perform all tests on
			let _objRecordInsertStep = null;

			try {
				_objRecordInsertStep = steps(strRecordInsertStepSysID);
			} 
			catch (e) {
				stepResult.setOutputMessage(
					`Could not find a valid step with Sys ID = ` +
					`"${strRecordInsertStepSysID}" for the current test!`
				);	
				stepResult.setFailed();
				return;			

			}


			// Fetch the record that was created by the specified test step
			// This record will be used as the "current" object for ACL evaluations
			const _strTableName        = String(_objRecordInsertStep.table);
			const _strSysID            = String(_objRecordInsertStep.record_id);
			const _grRecord            = new GlideRecord(_strTableName);

			if (
				!_grRecord.get(_strSysID)
			) {
				stepResult.setOutputMessage(
					`In table "${_strTableName}" no record could be found for ` +
					`Sys ID = "${_strSysID}"!`
				);				
				stepResult.setFailed();
				return;
			}


			// Determine the scope of the table to find a proper 
			// Script Include in that scope
			const _strTableScope = 
				new global.GlideQuery('sys_db_object')
					.where('name', _strTableName)
					.selectOne('sys_scope')
					.map(function(r) {return r.sys_scope;})
					.orElse('');


			// Retrieve a Script Include in the table scope 
			// to use as context for later script evaluations
			const _grSI = new GlideRecord('sys_script_include');

			_grSI.addQuery('sys_scope', _strTableScope);
			_grSI.setLimit(1);
			_grSI.setNoCount();
			_grSI.query();
			_grSI.next();


			// Create a scoped evaluator with the test record as the "current" context
			const _objEvaluator = new GlideScopedEvaluator();

			_objEvaluator.putVariable('current', _grRecord);


			// Define a Jasmine test suite that dynamically generates test cases from the Excel data
			describe(
				'Test ACLs on table "' + _strTableName + '"', 
				function() {
					_arrTestCases.forEach(function(objTestCase) {
						// Set the test script from the Excel file row and evaluate it
						_grSI.setValue('script', objTestCase.test);
						
						// Execute the ACL test logic and capture the result
						const _blnResult = _objEvaluator.evaluateScript(_grSI, 'script');

						// Create an individual test case that compares expected vs. actual ACL behavior
						it(
							objTestCase.description, 
							function() {
								expect(objTestCase.assertion).toBe(_blnResult);
							}
						);
					});
				}
			);
		}
		catch (e) {
			stepResult.setOutputMessage(
				`Unexpected JavaScript error: ` + e.message
			);
			
			stepResult.setFailed();
		}
	};
