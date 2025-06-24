var GlideRecordImpl = Class.create();

/**
 * This Script Include serves as a comprehensive facade around ServiceNow's 
 * out-of-the-box GlideRecord class, providing enhanced functionality, improved error handling
 * and additional safety mechanisms. It can be used as a base class for building your own 
 * data access and business objects.
 * 
 * @author Maik Skoddow (https://www.linkedin.com/in/maik-skoddow)
 * @version 1.0.0
 * @see {@link https://www.linkedin.com/pulse/servicenow-deployment-pipeline-part-5-programming-worth-skoddow-huxee/}
 */
GlideRecordImpl.prototype = {

	initialize: function(
		param1, 
		param2
	) {
		const METHOD_NAME = '[GlideRecordImpl.initialize] ';

		this._grRecordInstance = null;

		if (arguments.length === 0) {
			throw new TypeError(
				METHOD_NAME +
				'Object must be initialized with at least one parameter!'
			);
		}


		if (typeof param1 === 'object' && 
			(
				param1.isNewRecord() === true || 
				param1.isValidRecord() === true
			)
		) {
			if (typeof param2 === 'string' && param2 !== '') {
				if (!gs.tableExists(param2)) {
					throw new TypeError(
						METHOD_NAME +
						'"' + param2 + '" does not represent a valid ' +
						'table name for that instance!'
					);
				}

				if (param1.getTableName() !== param2) {
					throw new TypeError(
						METHOD_NAME +
						'"' + param2 + '" does ' +
						'not correspond to the table name of the passed GlideRecord!'
					);
				}
			}

			this._grRecordInstance = param1;
		}
		else if (typeof param1 === 'string') {
			if (!gs.tableExists(param1)) {
				throw new TypeError(
					METHOD_NAME +
					'"' + param1 + '" does not ' +
					'represent a valid table name for that instance!'
				);
			}

			this._grRecordInstance = new GlideRecord(param1);

			//only table name passed, therefore initialize a new record
			if (arguments.length === 1) {
				this._wasNewRecord = true;

				this._grRecordInstance.newRecord();
			}
			else if (typeof param2 === 'string') {
				if (GlideStringUtil.isEligibleSysID(param2)) {
					this._grRecordInstance.get(param2);
				}
			}
		}

		if (this._grRecordInstance === null) {
			throw new TypeError(
				METHOD_NAME +
				'Object not initialized with a valid GlideRecord instance!'
			);
		}
	},


	//-------------------------------------------------------------------------------------------
	// public Methods
	//-------------------------------------------------------------------------------------------


	toString: function(

	) {
		const METHOD_NAME = '[GlideRecordImpl.toString] ';

		return 'GlideRecord instance for table "' + this.getTableName() + '"';
	},


	/**
	 * Returns the internally stored reference to the GlideRecord record.
	 * 
	 * @returns {GlideRecord}
	 * Reference to the ServiceNow GlideRecord the object was initialized for.
	 */
	getGlideRecord: function(
		
	) {
		return this._grRecordInstance;
	},


	/**
	 * Determines whether the referenced GlideRecord instance is valid.
	 * 
	 * @returns {boolean}
	 * `true` if the referenced GlideRecord instance is valid, otherwise `false`.
	 */
	isValidRecord: function(

	) {
		const METHOD_NAME = '[GlideRecordImpl.isValidRecord] ';

		return this._isDeleted !== true && this.getGlideRecord().isValidRecord();
	},


	/**
	 * Determines whether the specified field is defined in the table the 
	 * GlideRecord was intialized for.
	 * 
	 * @param {string} strFieldName
	 * Name of the field to check.
	 * 
	 * @returns {boolean}
	 * `true` if the field is defined in the underlying table, otherwise `false`.
	 */
	isValidField: function(
		strFieldName
	) {
		const METHOD_NAME = '[GlideRecordImpl.isValidField] ';

		try {
			this._testFieldName(METHOD_NAME, strFieldName);

			return true;
		}
		catch (e) {
			return false;
		}
	},


	/**
	 * Determines whether the current record has been inserted into the database or not.
	 * 
	 * **Note:** 
	 * - This method returns true for any new record during a business rule,
	 * or if the `newRecord()` method is used to initialize a record with default values and a unique Sys ID. 
	 * - In all other cases, it returns false.
	 * 
	 * @returns {boolean}
	 * `true` if record was not already inserted into the database, otherwise `false`.
	 */
	isNewRecord: function(

	) {
		return this.getGlideRecord().isNewRecord();
	},


	/**
	 * Determines whether the access control rules (which includes the user's role) 
	 * permit reading records in this table.
	 *
	 * @returns {boolean}
	 * `true` if reading the record is permitted, otherwise `false`.
	 * 
	 * @throws {Error}
	 * If the underlying record already was deleted before.
	 */
	canRead: function(

	) {
		const METHOD_NAME = '[GlideRecordImpl.canRead] ';

		this._testIsDeleted(METHOD_NAME);

		return this.getGlideRecord().canRead();
	},


	/**
	 * Determines whether the access control rules (which includes the user's role) 
	 * permit updates to records in this table.
	 *
	 * @returns {boolean} 
	 * `true` if updating the record is permitted, otherwise `false`.
	 * 
	 * @throws {Error}
	 * If the underlying record already was deleted before.
	 */
	canWrite: function(

	) {
		const METHOD_NAME = '[GlideRecordImpl.canWrite] ';

		this._testIsDeleted(METHOD_NAME);

		return this.getGlideRecord().canWrite();
	},


	/**
	 * Determines whether the access control rules (which includes the user's role) 
	 * permit creating records in this table.
	 *
	 * @returns {boolean} 
	 * `true` if creating new records is permitted, otherwise `false`.
	 * 
	 * @throws {Error}
	 * If the underlying record already was deleted before.
	 */
	canCreate: function(

	) {
		const METHOD_NAME = '[GlideRecordImpl.canCreate] ';

		this._testIsDeleted(METHOD_NAME);

		return this.getGlideRecord().canCreate();
	},


	/**
	 * Determines whether the access control rules (which includes the user's role) 
	 * permit deletion of records in this table.
	 *
	 * @returns {boolean} 
	 * `true` if deleting the record is permitted, otherwise `false`.
	 * 
	 * @throws {Error}
	 * If the underlying record already was deleted before.
	 */
	canDelete: function(

	) {
		const METHOD_NAME = '[GlideRecordImpl.canDelete] ';

		this._testIsDeleted(METHOD_NAME);

		return this.getGlideRecord().canDelete();
	},


	/**
	 * Retrieves the name of the underlying table that the GlideRecord was initialized for.
	 * 
	 * @returns {string}
	 * Name of the underlying table that the GlideRecord was initialized for.
	 * 
	 * @throws {Error}
	 * If the underlying record already was deleted before.
	 */
	getTableName: function(

	) {
		const METHOD_NAME = '[GlideRecordImpl.getTableName] ';

		this._testIsDeleted(METHOD_NAME);

		return this.getGlideRecord().getTableName();
	},


	/**
	 * Gets the Sys ID of the record.
	 * 
	 * @returns {string}
	 * Sys ID of the record.
	 * 
	 * @throws {Error}
	 * If the underlying record already was deleted before.
	 */
	getSysID: function(

	) {
		const METHOD_NAME = '[GlideRecordImpl.getSysID] ';

		this._testIsDeleted(METHOD_NAME);

		return this.getGlideRecord().getValue('sys_id');
	},


	/**
	 * Gets the primary key of the record, which is usually the Sys ID unless otherwise specified.
	 * 
	 * @returns {string}
	 * Primary key of the record, which is usually the `sys_id` unless otherwise specified.
	 * 
	 * @throws {Error}
	 * If the underlying record already was deleted before.
	 */
	getUniqueValue: function(

	) {
		const METHOD_NAME = '[GlideRecordImpl.getUniqueValue] ';

		this._testIsDeleted(METHOD_NAME);

		return this.getGlideRecord().getUniqueValue();
	},


	/**
	 * Retrieves the link for the current record.
	 * 
	 * @param {boolean} noStack
	 * Flag to indicate whether to suppress the `sysparm_stack` URL paramter.
	 * 
	 * @returns {string}
	 * URL of the underlying record.
	 * 
	 * @throws {Error}
	 * If the underlying record already was deleted before.
	 */
	getLink: function(
		noStack
	) {
		const METHOD_NAME = '[GlideRecordImpl.getLink] ';

		this._testIsDeleted(METHOD_NAME);

		if (arguments.length > 0 && typeof noStack !== 'boolean') {
			throw new TypeError(
				METHOD_NAME +
				`Value in parameter "noStack" is not of boolean type!`
			);
		}

		return this.getGlideRecord().getLink(noStack);
	},


	/**
	 * Retrieves the display value for the current record if no parameter was passed 
	 * or for the specified field in parameter `strFieldName`.
	 * 
	 * @param [string] strFieldName
	 * If specified `strFieldName` must represent a column in the underlying table.
	 * 
	 * @returns {string}
	 * Either the display value of the underlying record or of the specified field.
	 * 
	 * @throws {Error}
	 * - If the underlying record already was deleted before.
	 * - If the specified field name does not represent a valid database column. 
	 */
	getDisplayValue: function(
		strFieldName
	) {
		const METHOD_NAME = '[GlideRecordImpl.getDisplayValue] ';

		if (arguments.length === 0) {
			return String(this.getGlideRecord().getDisplayValue());
		}

		this._testIsDeleted(METHOD_NAME);
		this._testFieldName(METHOD_NAME, strFieldName);

		return String(this.getGlideRecord().getElement(strFieldName).getDisplayValue());
	},


	/**
	 * Returns an internal name for the type of a field.
	 * 
	 * @param {string} strFieldName
	 * Name of the corresponding database column.
	 * 
	 * @returns {string}
	 * Internal name for the field type like "number" or "glide_data_time".
	 * 
	 * @throws {TypeError}
	 * If value in `strFieldName` does not exists or is empty.
	 * 
	 * @throws {Error}
	 * - If the underlying record already was deleted before.
	 * - If the specified field name does not represent a valid database column. 
	 * 
	 * @see 
	 * {@link https://www.servicenow.com/docs/csh?topicname=r_FieldTypes.html&version=latest} 
	 * for a list of all types.
	 */
	getFieldType: function(
		strFieldName
	) {
		const METHOD_NAME = '[GlideRecordImpl.getFieldType] ';

		this._testIsDeleted(METHOD_NAME);
		this._testFieldName(METHOD_NAME, strFieldName);

		return this.getGlideRecord().getElement(strFieldName).getED().getInternalType();
	},



	/**
	 * Returns for the specified field an object representing any ServiceNow object 
	 * depending on the field type. For example for a field of type 'date/time' that method
	 * would return a reference to an initialized GlideDateTime object.
	 * 
	 * @param {string} strFieldName
	 * Name of the corresponding database column.
	 * 
	 * @returns {object}
	 * Any ServiceNow object, or null if the field has no value or is not eligible to 
	 * return an object, such as a "string" field.
	 * 
	 * @throws {TypeError}
	 * If value in `strFieldName` does not exists or is empty.
	 * 
	 * @throws {Error}
	 * - If the underlying record already was deleted before.
	 * - If the specified field name does not represent a valid database column. 
	 */
	getGlideObject: function(
		strFieldName
	) {
		const METHOD_NAME = '[GlideRecordImpl.getGlideObject] ';

		this._testIsDeleted(METHOD_NAME);
		this._testFieldName(METHOD_NAME, strFieldName);

		return this.hasValue(strFieldName) ?
				this.getGlideRecord().getElement(strFieldName).getGlideObject() || null :
				null;
	},


	/**
	 * Returns a GlideRecord object for a given reference field. 
	 * 
	 * **Warning:** If the reference element does not contain a value, 
	 * it returns an empty GlideRecord object, not a NULL object.
	 * 
	 * @param {string} strFieldName
	 * Name of the corresponding database column.
	 * 
	 * @returns {GlideRecord}
	 * An instance of a GlideRecord object - either fully initialized or empty.
	 * 
	 * @throws {TypeError}
	 * - If value in `strFieldName` does not exists or is empty.
	 * - If field is not of type "reference".
	 * 
	 * @throws {Error}
	 * - If the underlying record already was deleted before.
	 * - If the specified field name does not represent a valid database column. 
	 */
	getRefRecord: function(
		strFieldName
	) {
		const METHOD_NAME = '[GlideRecordImpl.getRefRecord] ';

		this._testIsDeleted(METHOD_NAME);
		this._testFieldName(METHOD_NAME, strFieldName);

		if (this.getFieldType(strFieldName) !== 'reference') {
			throw new TypeError(
				METHOD_NAME + 
				`"${strFieldName}" does not represent a reference field!`
			);
		}

		return this.getGlideRecord().getElement(strFieldName).getRefRecord();
	},


	/**
	 * Retrieves the label of either the table (optionally in the plural form) 
	 * or the specified field.
	 * 
	 * @param [boolean|string] objParam
	 * If the parameter is empty or of boolean type, the label of the underlying table 
	 * is returned in singular form. If `objParam` is `true`, the label is returned in 
	 * plural form. If `objParam` is a string, the label of the respective field is returned.
	 * 
	 * @returns {string}
	 * Either the label of the underlying table or the specified field.
	 * 
	 * @throws {TypeError}
	 * For field-based retrieval: 
	 * If value in `objParam` does not exists or is empty.
	 * 
	 * @throws {Error}
	 * - If the underlying record already was deleted before.
	 * - For field-based retrieval: 
	 * If value in `objParam` does not represent a valid database column.
	 */
	getLabel: function(
		objParam
	) {
		const METHOD_NAME = '[GlideRecordImpl.getLabel] ';

		this._testIsDeleted(METHOD_NAME);

		//1st option: retrieve the table label - optionally in the plural form
		if (arguments.length === 0 || typeof objParam === 'boolean') {
			return objParam === true ?
				String(this.getGlideRecord().getPlural()) : 
				String(this.getGlideRecord().getClassDisplayValue());
		}

		//2nd option: retrieve a field's label
		this._testFieldName(METHOD_NAME, objParam);

		return this.getGlideRecord().getElement(objParam).getLabel();			
	},
	
	
	/**
	 * Determines whether the specified field is defined has a value. 
	 * 
	 * @param {string} strFieldName
	 * Name of the field to check.
	 * 
	 * @returns {boolean}
	 * `true` if the field has a value, otherwise `false`.
	 * 
	 * @throws {TypeError}
	 * If value in `strFieldName` does not exists or is empty.
	 * 
	 * @throws {Error}
	 * - If the underlying record already was deleted before.
	 * - If the specified field name does not represent a valid database column. 
	 */
	hasValue: function(
		strFieldName
	) {
		const METHOD_NAME = '[GlideRecordImpl.hasValue] ';

		this._testIsDeleted(METHOD_NAME);
		this._testFieldName(METHOD_NAME, strFieldName);

		return !this.getGlideRecord().getElement(strFieldName).nil();
	},


	/**
	 * Returns the value of the specified field.
	 * 
	 * @param {string} strFieldName
	 * Name of the field whose content is to be returned.
	 * 
	 * @returns {string}
	 * The value of the specified field or an empty string if it has no value.
	 * 
	 * @throws {TypeError}
	 * If value in `strFieldName` does not exists or is empty.
	 * 
	 * @throws {Error}
	 * - If the underlying record already was deleted before.
	 * - If the specified field name does not represent a valid database column. 
	 */
	getValue: function(
		strFieldName
	) {
		const METHOD_NAME = '[GlideRecordImpl.getValue] ';

		this._testIsDeleted(METHOD_NAME);
		this._testFieldName(METHOD_NAME, strFieldName);

		return String(this.getGlideRecord().getValue(strFieldName) || '').trim();
	},


	/**
	 * Returns the clear text value for Password (2 way encrypted) fields.
	 * 
	 * @param {string} strFieldName
	 * Name of the field whose content is to be decrypted.
	 * 
	 * @returns {string}
	 * Plain text value of the dercypted content.
	 * 
	 * @throws {TypeError}
	 * - If value in `strFieldName` does not exists or is empty.
 	 * - If field is not of type "password2".
	 * 
	 * @throws {Error}
	 * - If the underlying record already was deleted before.
	 * - If the specified field name does not represent a valid database column. 
	 */
	getDecryptedValue: function(
		strFieldName
	) {
		const METHOD_NAME = '[GlideRecordImpl.getDecryptedValue] ';

		this._testIsDeleted(METHOD_NAME);
		this._testFieldName(METHOD_NAME, strFieldName);

		if (this.getFieldType(strFieldName) !== 'password2') {
			throw new TypeError(
				METHOD_NAME + 
				`"${strFieldName}" does not represent a Password2 field!`
			);
		}

		return this.getGlideRecord().getElement(strFieldName).getDecryptedValue();
	},


	/**
	 * Sets the value of a field by considering different field types, so this method also 
	 * works for "Password2" and "Journal" fields.
	 * 
	 * @param {string} strFieldName
	 * Name of the field whose content is to be decrypted.
	 * 
	 * @param {object} objFieldValue
	 * Value that should be set for the specified field.
	 * 
	 * @throws {TypeError}
	 * - If value in `strFieldName` does not exists or is empty.
 	 * - If value in `objFieldValue` does not exists or is null.
	 * 
	 * @throws {Error}
	 * - If the underlying record already was deleted before.
	 * - If the specified field name does not represent a valid database column. 
	 */
	setValue: function(
		strFieldName, 
		objFieldValue
	) {
		const METHOD_NAME = '[GlideRecordImpl.setValue] ';

		this._testIsDeleted(METHOD_NAME);
		this._testFieldValue(METHOD_NAME, strFieldName, objFieldValue);

		switch (this.getFieldType(strFieldName)) {
			case 'password2':
				this.getGlideRecord().getElement(strFieldName).setDisplayValue(objFieldValue);
				break;

			case 'journal_input':
				this.getGlideRecord().getElement(strFieldName).setJournalEntry(objFieldValue);
				break;

			default:
				this.getGlideRecord().getElement(strFieldName).setValue(objFieldValue);
				break;
		}		
	},


	/**
	 * Inserts a new record into the database with its specified field values.
	 * 
	 * @returns {string}
	 * The Sys ID of the inserted record, or `null` if the record could not be inserted.
	 * 
	 * @throws {Error}
	 * - If the underlying record already was inserted before.
	 * - If the underlying record already was deleted before.
	 */
	insert: function(

	) {
		const METHOD_NAME = '[GlideRecordImpl.insert] ';

		this._testIsInserted(METHOD_NAME);
		this._testIsDeleted(METHOD_NAME);
		
		return this.getGlideRecord().insert();
	},


	/**
	 * Updates a new record into the database with its specified field values.
	 * 
	 * @returns {string}
	 * The Sys ID of the updated record, or `null` if the record could not be updated.
	 * 
	 * @throws {Error}
	 * - If the underlying record was not inserted before.
	 * - If the underlying record already was deleted before.
	 */
	update: function(

	) {
		const METHOD_NAME = '[GlideRecordImpl.update] ';

		this._testIsNotInserted(METHOD_NAME);
		this._testIsDeleted(METHOD_NAME);

		return this.getGlideRecord().update();
	},


	/**
	 * Deletes the underlying record in the database.
	 * 
	 * @returns {boolean}
	 * `true` if the record was successfully deleted, otherwise `false`.
	 * 
	 * @throws {Error}
	 * - If the underlying record was not inserted before.
	 * - If the underlying record already was deleted before.
	 */
	deleteRecord: function(

	) {
		const METHOD_NAME = '[GlideRecordImpl.deleteRecord] ';

		this._testIsNotInserted(METHOD_NAME);
		this._testIsDeleted(METHOD_NAME);

		var _grRecord = this.getGlideRecord();

		//if the record recently was initialized we need to get a fresh GlideRecord,
		//otherwise an internal exception will be thrown by ServiceNow
		if (this._wasNewRecord === true) {
			_grRecord = new GlideRecord(this.getTableName());

			if (!_grRecord.get(this.getSysID())) {
				throw new Error(
					METHOD_NAME + 
					`No record exists for Sys ID = "${this.getSysID()}" ` +
					`at table "${this.getTableName()}"!`
				);
			}
		}

		this._isDeleted = _grRecord.deleteRecord();

		return this._isDeleted;
	},


	//-------------------------------------------------------------------------------------------
	// private Methods
	//-------------------------------------------------------------------------------------------

	/**
	 * Tests if the passed field name is valid and also represents a database column 
	 * in the underlying table.
	 * 
	 * @param {string} strFieldName
	 * Name of the database column to test.
	 * 
	 * @throws {TypeError}
	 * If value in `strFieldName` does not exists or is empty.
	 * 
	 * @throws {Error}
	 * If the specified field name does not represent a valid database column.
	 */	
	_testFieldName: function(
		strMethodName,
		strFieldName
	) {
		if (typeof strFieldName === 'undefined') {
			throw new TypeError(
				strMethodName + 'No field name for validation passed!'
			);
		}

		var _strFieldName = String(strFieldName).trim();

		if (_strFieldName === '') {
			throw new TypeError(
				strMethodName + 'No field name for validation passed!'
			);
		}

		if (!this.getGlideRecord().isValidField(_strFieldName)) {
			throw new Error(
				strMethodName + 
				`"${_strFieldName}" is not a valid field name ` +
				`for table "${this.getTableName()}"!`
			);
		}
	},


	_testFieldValue: function(
		strMethodName,
		strFieldName,
		strFieldValue
	) {
		this._testFieldName(strMethodName, strFieldName);

		if (typeof strFieldValue === 'undefined' || strFieldValue === null) {
			throw new TypeError(
				strMethodName + 
				`No value for the field ${strFieldName} was passed!`
			);
		}		
	},


	_testIsInserted: function(
		strMethodName
	) {
		if (!this.isNewRecord()) {
			throw new Error(
				strMethodName + 
				`Record with Sys ID = "${this.getSysID()}" already exists in the database!`
			);
		}
	},


	_testIsNotInserted: function(
		strMethodName
	) {
		if (this.isNewRecord()) {
			throw new Error(
				strMethodName + 'The record was not inserted before yet!'
			);
		}
	},


	_testIsDeleted: function(
		strMethodName
	) {
		if (this._isDeleted === true) {
			throw new Error(
				strMethodName + `The Record with Sys ID = "${this.getSysID()}" ` +
				`already was deleted from table "${this.getTableName()}"!`
			);
		}
	},

	type: 'GlideRecordImpl'
};
