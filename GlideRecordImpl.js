/**
 * This Script Include serves as a comprehensive facade around ServiceNow's 
 * out-of-the-box `GlideRecord` and `GlideRecordSecire` classes, providing enhanced 
 * functionality, improved error handling and additional safety mechanisms. It can 
 * be used as a base class for your own data access and business objects.
 * 
 * **Please note:**
 * - Please bear in mind that this class is only a starting point and may need to be 
 * extended or adapted by you.
 * - The source code incorporates language elements from the ECMAScript 2021 engine, 
 * like `class`, `const` or string literals.
 * - Only `GlideRecord` methods related to single-record access are wrapped. Bulk or 
 * list-based operations are intentionally excluded, as such scenarios are better 
 * addressed using a different design pattern, for example, the "Repository Pattern".
 * 
 * @author Maik Skoddow (https://www.linkedin.com/in/maik-skoddow)
 * @version 2.0.0
 * @see {@link https://www.linkedin.com/pulse/servicenow-deployment-pipeline-part-5-programming-worth-skoddow-huxee/}
 */
class GlideRecordImpl {
	/**
	 * This constructor is invoked to instantiate new objects from that class.
	 * 
	 * There are three different ways of constructing a new object, and for the 
	 * last two approaches, an additional Boolean parameter can be used to 
	 * specify whether a `GlideRecordSecure` object should be used 
	 * instead of a `GlideRecord` object.
	 * @param {...(GlideRecord|GlideRecordSecure|string|boolean)} args
	 * Constructor arguments (see above)
	 * 
	 * @throws {TypeError} 
	 * If the signature is not supported or arguments are invalid.
	 * 
	 * @example
	 * // (1) with an existing `GlideRecord` instance (e.g. in a Business Rule)
	 * var objIncident = new GlideRecordImpl(current);
	 *
	 * // (2.1) only with a table name (creates a new record that can be inserted)
	 * var objIncident = new GlideRecordImpl('incident');
	 * 
	 * // (2.2) Just like (2.1) but with a `GlideRecordSecure` object
	 * var objIncident = new GlideRecordImpl('incident', true);
	 * 
	 * // (3.1) with table name and Sys ID (retrieves an existing record)
	 * var objIncident = new GlideRecordImpl('incident', 'b3af7471c31a6a90108c78edd40131aa');
	 * 
	 * // (3.2) Just like (3.1) but with a `GlideRecordSecure` object
	 * var objIncident = new GlideRecordImpl('incident', 'b3af7471c31a6a90108c78edd40131aa', true);
	 */
	constructor(
		...args
	) {
		const OVERLOAD_REGISTRY =
			new Map([
				['object', (...args) => this._newWithGlideRecord(...args)],
				['string', (...args) => this._newWithTable(...args)],
				['string,boolean', (...args) => this._newWithTable(...args)],
				['string,string', (...args) => this._newWithTableAndSysID(...args)],
				['string,string,boolean', (...args) => this._newWithTableAndSysID(...args)],
			]);

		//build the constructor signature
		let _strSignature =
			args.map(arg =>
				Array.isArray(arg) ? 'array' : typeof arg
			).join(',');

		//is a constructor method registered for the signature?
		if (OVERLOAD_REGISTRY.has(_strSignature)) {
			//invoke the registered constructor method
			OVERLOAD_REGISTRY.get(_strSignature)(...args);
		}
		else {
			throw new TypeError(
				`[${this.constructor.name}.constructor] ` +
				`Unsupported signature "${_strSignature}"`
			);
		}
	}


	/**
	 * @private
	 * Initializes with an existing `GlideRecord` or `GlideRecordSecure` instance.
	 * 
	 * @param {GlideRecord|GlideRecordSecure|null} objRecord
	 * 
	 * @throws {TypeError} 
	 * If objRecord is not a valid `GlideRecord` or `GlideRecordSecure` instance.
	 */
	_newWithGlideRecord(
		objRecord = null,
	) {
		if ((objRecord instanceof GlideRecord || objRecord instanceof GlideRecordSecure)
			&&
			(objRecord.isValidRecord() === true)
		) {
			this._grRecordInstance = objRecord;
		}
		else {
			throw new TypeError(
				`[${this.constructor.name}.constructor] Passed object ` +
				`does not represent a valid GlideRecord instance!`
			);
		}
	}


	/**
	 * @private
	 * Initializes a new `GlideRecord` or `GlideRecordSecure` record based 
	 * on the given table name.
	 * 
	 * @param {string} strTableName
	 * A valid table name for that instance.
	 * 
	 * @param {boolean} [isSecure=false]
	 * If `true` a `GlideRecordSecure` object is instantiated, otherwise 
	 * a `GlideRecord` object.
	 * 
	 * @throws {TypeError} 
	 * If table name is invalid.
	 */
	_newWithTable(
		strTableName = 'x',
		isSecure = false,
	) {
		if (!gs.tableExists(strTableName)) {
			throw new TypeError(
				`[${this.constructor.name}.constructor] "${strTableName}" ` +
				`does not represent a valid table name for that instance!`
			);
		}

		this._wasNewRecord = true;
		this._grRecordInstance =
			isSecure ?
				new GlideRecordSecure(strTableName) :
				new GlideRecord(strTableName);

		this._grRecordInstance.newRecord();
	}


	/**
	 * @private
	 * Retrieves an existing `GlideRecord` or `GlideRecordSecure` record based 
	 * on the given table name and Sys ID.
	 * 
	 * @param {string} strTableName
	 * A valid table name for that instance.
	 * 
	 * @param {string} strSysID
	 * A valid ServiceNow Sys ID.
	 * 
	 * @param {boolean} [isSecure=false]
	 * If `true` a `GlideRecordSecure` object is instantiated, otherwise 
	 * a `GlideRecord` object.
	 * 
	 * @throws {TypeError} 
	 * If table name or Sys ID is invalid.
	 */
	_newWithTableAndSysID(
		strTableName = 'x',
		strSysID = 'x',
		isSecure = false,
	) {
		if (!gs.tableExists(strTableName)) {
			throw new TypeError(
				`[${this.constructor.name}.constructor] "${strTableName}" ` +
				`does not represent a valid table name for that instance!`
			);
		}

		if (!GlideStringUtil.isEligibleSysID(strSysID)) {
			throw new TypeError(
				`[${this.constructor.name}.constructor] "${strSysID}" ` +
				`does not represent a valid Sys ID!`
			);
		}

		this._grRecordInstance =
			isSecure ?
				new GlideRecordSecure(strTableName) :
				new GlideRecord(strTableName);

		this._grRecordInstance.get(strSysID);
	}


	//-------------------------------------------------------------------------------------------
	// public Methods
	//-------------------------------------------------------------------------------------------

	/**
	 * Provide a human-readable string representation of the created object, 
	 * typically for debugging, logging, or display purposes.
	 * 
	 * @returns {string}
	 * Some technical information about the `GlideRecord` instance that this object is 
	 * the facade for.
	 */
	toString(

	) {
		return '' +
			`Facade for a GlideRecord instance:\n` +
			`Instantiated class: "${this.type}"\n` +
			`Record table: ${this.getTableName()} (${this.getLabel()})\n` +
			`Record Sys ID: ${this.getSysID()}\n` +
			`Record is new: ${this.isNewRecord()}\n` +
			`Record is deleted: ${this.isDeletedRecord()}\n`;
	}


	/**
	 * Returns the internally stored reference to the 
	 * `GlideRecord` or `GlideRecordSecure` instance.
	 * 
	 * @returns {GlideRecord|GlideRecordSecure}
	 * Reference to the ServiceNow `GlideRecord` or `GlideRecordSecure` 
	 * instance the object was initialized for.
	 */
	getGlideRecord(

	) {
		return this._grRecordInstance;
	}


	/**
	 * Determines if the referenced `GlideRecord` instance is valid.
	 * 
	 * @returns {boolean}
	 * `true` if the referenced `GlideRecord` instance is valid, otherwise `false`.
	 */
	isValidRecord(

	) {
		return true &&
			this._isDeleted !== true &&
			this.getGlideRecord().isValidRecord();
	}


	/**
	 * Determines if the specified field is defined in the table the 
	 * internally referenced `GlideRecord` or `GlideRecordSecure` instance was 
	 * intialized for.
	 * 
	 * @param {string} strFieldName
	 * Name of the field to check.
	 * 
	 * @returns {boolean}
	 * `true` if the field is defined in the underlying table, otherwise `false`.
	 */
	isValidField(
		strFieldName
	) {
		const METHOD_NAME = `[${this.constructor.name}.isValidField] `;

		try {
			this._testFieldName(METHOD_NAME, strFieldName);

			return true;
		}
		catch (e) {
			return false;
		}
	}


	/**
	 * Determines if the underlying record has been inserted into the database or not.
	 *  
	 * @returns {boolean}
	 * `true` if the underlying record was not already inserted 
	 * into the database, otherwise `false`.
	 */
	isNewRecord(

	) {
		return this.getGlideRecord().isNewRecord();
	}


	/**
	 * Determines if the underlying record was deleted.
	 *  
	 * @returns {boolean}
	 * `true` if record was deleted, otherwise `false`.
	 */
	isDeletedRecord(

	) {
		return this._isDeleted === true;
	}


	/**
	 * Determines if the access control rules permit reading records in this table
	 * or - if specified - in the associated field.
	 *
	 * @param [string] strFieldName
	 * If specified `strFieldName` must represent a column in the underlying table.

	 * @returns {boolean} 
	 * `true` if reading records or values in the specified field is 
	 * permitted, otherwise `false`.
	 * 
	 * @throws {Error}
	 * - If the underlying record already was deleted before.
	 * - If the specified field name does not represent a valid database column. 
	 */
	canRead(
		strFieldName
	) {
		const METHOD_NAME = `[${this.constructor.name}.canRead] `;

		this._testIsDeleted(METHOD_NAME);

		if (arguments.length === 0) {
			return this.getGlideRecord().canRead();
		}

		this._testFieldName(METHOD_NAME, strFieldName);

		return this.getGlideRecord().getElement(strFieldName).canRead();
	}


	/**
	 * Determines if the access control rules permit updating records in this table
	 * or - if specified - in the associated field.
	 *
	 * @param [string] strFieldName
	 * If specified `strFieldName` must represent a column in the underlying table.

	 * @returns {boolean} 
	 * `true` if updating records or values in the specified field is 
	 * permitted, otherwise `false`.
	 * 
	 * @throws {Error}
	 * - If the underlying record already was deleted before.
	 * - If the specified field name does not represent a valid database column. 
	 */
	canWrite(
		strFieldName
	) {
		const METHOD_NAME = `[${this.constructor.name}.canWrite] `;

		this._testIsDeleted(METHOD_NAME);

		if (arguments.length === 0) {
			return this.getGlideRecord().canWrite();
		}

		this._testFieldName(METHOD_NAME, strFieldName);

		return this.getGlideRecord().getElement(strFieldName).canWrite();
	}


	/**
	 * Determines if the access control rules permit creating records in this table
	 * or - if specified - in the associated field.
	 *
	 * @param [string] strFieldName
	 * If specified `strFieldName` must represent a column in the underlying table.

	 * @returns {boolean} 
	 * `true` if creating new records or values in the specified field is 
	 * permitted, otherwise `false`.
	 * 
	 * @throws {Error}
	 * - If the underlying record already was deleted before.
	 * - If the specified field name does not represent a valid database column. 
	 */
	canCreate(
		strFieldName
	) {
		const METHOD_NAME = `[${this.constructor.name}.canCreate] `;

		this._testIsDeleted(METHOD_NAME);

		if (arguments.length === 0) {
			return this.getGlideRecord().canCreate();
		}

		this._testFieldName(METHOD_NAME, strFieldName);

		return this.getGlideRecord().getElement(strFieldName).canCreate();
	}


	/**
	 * Determines if the access control rules permit deleting records in this table
	 * or - if specified - in the associated field.
	 *
	 * @param [string] strFieldName
	 * If specified `strFieldName` must represent a column in the underlying table.

	 * @returns {boolean} 
	 * `true` if deleting records or values in the specified field is 
	 * permitted, otherwise `false`.
	 * 
	 * @throws {Error}
	 * - If the underlying record already was deleted before.
	 * - If the specified field name does not represent a valid database column. 
	 */
	canDelete(
		strFieldName
	) {
		const METHOD_NAME = `[${this.constructor.name}.canDelete] `;

		this._testIsDeleted(METHOD_NAME);

		if (arguments.length === 0) {
			return this.getGlideRecord().canDelete();
		}

		this._testFieldName(METHOD_NAME, strFieldName);

		return this.getGlideRecord().getElement(strFieldName).canDelete();
	}


	/**
	 * Retrieves the name of the underlying table that the `GlideRecord` was initialized for.
	 * 
	 * @returns {string}
	 * Name of the underlying table that the `GlideRecord` was initialized for.
	 * 
	 * @throws {Error}
	 * If the underlying record already was deleted before.
	 */
	getTableName(

	) {
		const METHOD_NAME = `[${this.constructor.name}.getTableName] `;

		this._testIsDeleted(METHOD_NAME);

		return this.getGlideRecord().getTableName();
	}


	/**
	 * Gets the Sys ID of the record.
	 * 
	 * @returns {string}
	 * Sys ID of the record.
	 * 
	 * @throws {Error}
	 * If the underlying record already was deleted before.
	 */
	getSysID(

	) {
		const METHOD_NAME = `[${this.constructor.name}.getSysID] `;

		this._testIsDeleted(METHOD_NAME);

		return this.getGlideRecord().getValue('sys_id');
	}


	/**
	 * Gets the primary key of the record, which is usually the Sys ID unless otherwise specified.
	 * 
	 * @returns {string}
	 * Primary key of the record, which is usually the `sys_id` unless otherwise specified.
	 * 
	 * @throws {Error}
	 * If the underlying record already was deleted before.
	 */
	getUniqueValue(

	) {
		const METHOD_NAME = `[${this.constructor.name}.getUniqueValue] `;

		this._testIsDeleted(METHOD_NAME);

		return this.getGlideRecord().getUniqueValue();
	}


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
	getLink(
		noStack
	) {
		const METHOD_NAME = `[${this.constructor.name}.getLink] `;

		this._testIsDeleted(METHOD_NAME);

		if (arguments.length > 0 && typeof noStack !== 'boolean') {
			throw new TypeError(
				METHOD_NAME +
				`Value in parameter "noStack" is not of boolean type!`
			);
		}

		return this.getGlideRecord().getLink(noStack);
	}


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
	getDisplayValue(
		strFieldName
	) {
		const METHOD_NAME = `[${this.constructor.name}.getDisplayValue] `;

		this._testIsDeleted(METHOD_NAME);

		if (arguments.length === 0) {
			return String(this.getGlideRecord().getDisplayValue());
		}

		this._testFieldName(METHOD_NAME, strFieldName);

		return String(this.getGlideRecord().getElement(strFieldName).getDisplayValue());
	}


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
	getFieldType(
		strFieldName
	) {
		const METHOD_NAME = `[${this.constructor.name}.getFieldType] `;

		this._testIsDeleted(METHOD_NAME);
		this._testFieldName(METHOD_NAME, strFieldName);

		return this.getGlideRecord().getElement(strFieldName).getED().getInternalType();
	}



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
	getGlideObject(
		strFieldName
	) {
		const METHOD_NAME = `[${this.constructor.name}.getGlideObject] `;

		this._testIsDeleted(METHOD_NAME);
		this._testFieldName(METHOD_NAME, strFieldName);

		return this.hasValue(strFieldName) ?
			this.getGlideRecord().getElement(strFieldName).getGlideObject() || null :
			null;
	}


	/**
	 * Returns a `GlideRecord` object for a given reference field. 
	 * 
	 * **Warning:** If the reference element does not contain a value, 
	 * it returns an empty `GlideRecord` object, not a NULL object.
	 * 
	 * @param {string} strFieldName
	 * Name of the corresponding database column.
	 * 
	 * @returns {GlideRecord}
	 * An instance of a `GlideRecord` object - either fully initialized or empty.
	 * 
	 * @throws {TypeError}
	 * - If value in `strFieldName` does not exists or is empty.
	 * - If field is not of type "reference".
	 * 
	 * @throws {Error}
	 * - If the underlying record already was deleted before.
	 * - If the specified field name does not represent a valid database column. 
	 */
	getRefRecord(
		strFieldName
	) {
		const METHOD_NAME = `[${this.constructor.name}.getRefRecord] `;

		this._testIsDeleted(METHOD_NAME);
		this._testFieldName(METHOD_NAME, strFieldName);

		if (this.getFieldType(strFieldName) !== 'reference') {
			throw new TypeError(
				METHOD_NAME +
				`"${strFieldName}" does not represent a reference field!`
			);
		}

		return this.getGlideRecord().getElement(strFieldName).getRefRecord();
	}


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
	getLabel(
		objParam
	) {
		const METHOD_NAME = `[${this.constructor.name}.getLabel] `;

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
	}


	/**
	 * Determines if the specified field is defined has a value. 
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
	hasValue(
		strFieldName
	) {
		const METHOD_NAME = `[${this.constructor.name}.hasValue] `;

		this._testIsDeleted(METHOD_NAME);
		this._testFieldName(METHOD_NAME, strFieldName);

		return !this.getGlideRecord().getElement(strFieldName).nil();
	}


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
	getValue(
		strFieldName
	) {
		const METHOD_NAME = `[${this.constructor.name}.getValue] `;

		this._testIsDeleted(METHOD_NAME);
		this._testFieldName(METHOD_NAME, strFieldName);

		return String(this.getGlideRecord().getValue(strFieldName) || '').trim();
	}


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
	getDecryptedValue(
		strFieldName
	) {
		const METHOD_NAME = `[${this.constructor.name}.getDecryptedValue] `;

		this._testIsDeleted(METHOD_NAME);
		this._testFieldName(METHOD_NAME, strFieldName);

		if (this.getFieldType(strFieldName) !== 'password2') {
			throw new TypeError(
				METHOD_NAME +
				`"${strFieldName}" does not represent a Password2 field!`
			);
		}

		return this.getGlideRecord().getElement(strFieldName).getDecryptedValue();
	}


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
	setValue(
		strFieldName,
		objFieldValue
	) {
		const METHOD_NAME = `[${this.constructor.name}.setValue] `;

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
	}


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
	insert(

	) {
		const METHOD_NAME = `[${this.constructor.name}.insert] `;

		this._testIsInserted(METHOD_NAME);
		this._testIsDeleted(METHOD_NAME);

		return this.getGlideRecord().insert();
	}


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
	update(

	) {
		const METHOD_NAME = `[${this.constructor.name}.update] `;

		this._testIsNotInserted(METHOD_NAME);
		this._testIsDeleted(METHOD_NAME);

		return this.getGlideRecord().update();
	}


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
	deleteRecord(

	) {
		const METHOD_NAME = `[${this.constructor.name}.deleteRecord] `;

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
	}


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
	_testFieldName(
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
	}


	_testFieldValue(
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
	}


	_testIsInserted(
		strMethodName
	) {
		if (!this.isNewRecord()) {
			throw new Error(
				strMethodName +
				`Record with Sys ID = "${this.getSysID()}" already exists in the database!`
			);
		}
	}


	_testIsNotInserted(
		strMethodName
	) {
		if (this.isNewRecord()) {
			throw new Error(
				strMethodName + 'The record was not inserted before yet!'
			);
		}
	}


	_testIsDeleted(
		strMethodName
	) {
		if (this._isDeleted === true) {
			throw new Error(
				strMethodName + `The Record with Sys ID = "${this.getSysID()}" ` +
				`already was deleted from table "${this.getTableName()}"!`
			);
		}
	}
}
