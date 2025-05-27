/*
 * Tests whether passed value in parameter `grRecordInstance` represents a 
 * valid GlideRecord instance.
 * 
 * @param {Object} grRecordInstance
 *   Reference to an instance of a GlideRecord object.
 *
 * @param {String} [strTableName]
 *   If specified an additional check of the GlideRecord against the given table 
 *   name is performed.
 *
 * @returns {Boolean}
 *   `true` if the passed value in parameter `grRecordInstance` represents a 
 *   valid GlideRecord instance, otherwise `false`.
 *
 * @throws TypeError
 *   In case no parameter values have been passed. 
 */
function isValidGlideRecord(grRecordInstance, strTableName) {	
	if (arguments.length === 0) {
		throw new TypeError('At least one parameter value is expected!');
	}
	
	var _isValid = 
		typeof grRecordInstance === 'object' &&
		grRecordInstance instanceof GlideRecord &&
		(
			grRecordInstance.isValidGlideRecord() || 
			grRecordInstance.isNewRecord() || 
			grRecordInstance.isValid()
		);
	
	if (_isValid && typeof strTableName === 'string') {
		_isValid = grRecordInstance.getTableName() === strTableName.trim();
	}

	return _isValid;
};
