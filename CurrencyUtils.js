var CurrencyUtils = Class.create();

CurrencyUtils.METHOD_CONVERT = 'CurrencyUtils.convert';

CurrencyUtils.METHOD_PARAMETER_SOURCECURRENCY = 'strSourceCurrency';
CurrencyUtils.METHOD_PARAMETER_TARGETCURRENCY = 'strTargetCurrency';
CurrencyUtils.METHOD_PARAMETER_ORIGINALAMOUNT = 'strOriginalAmount';
CurrencyUtils.METHOD_PARAMETER_LOCALE         = 'strLocale';

CurrencyUtils.AJAX_PARAMETER_SOURCECURRENCY   = 'sysparm_source_currency';
CurrencyUtils.AJAX_PARAMETER_TARGETCURRENCY   = 'sysparm_target_currency';
CurrencyUtils.AJAX_PARAMETER_ORIGINALAMOUNT   = 'sysparm_original_amount';
CurrencyUtils.AJAX_PARAMETER_LOCALE           = 'sysparm_locale';

/**
 * Helper class for dealing with currencies.
 * All methods can be called both server-side and client-side.
 *
 * @class CurrencyUtils
 * @author Maik Skoddow
 * @see https://www.servicenow.com/community/developer-articles/universal-pattern-for-script-includes/ta-p/2323602
 */
CurrencyUtils.prototype = Object.extendsObject(global.AbstractAjaxProcessor, {

	/*
	 * Converts a number for a given currency to the value of a target currency with the help of a ServiceNow API.
     * The conversion rates are determined automatically on a daily basis by ServiceNow.
	 *
	 * @param {String} strSourceCurrency Original currency of the given amount to be converted as 
     * a 3-letter code defined by the <a href="https://en.wikipedia.org/wiki/ISO_4217">ISO 4217</a>.
     * @param {String} strTargetCurrency Target currency the given amount should be converted to as 
     * a 3-letter code defined by the <a href="https://en.wikipedia.org/wiki/ISO_4217">ISO 4217</a>.
	 * @return {JSON} Value object containing all information. In casde of errors the property `error_message` 
     * contains a respective message.
	 */
	convert: function(strSourceCurrency, strTargetCurrency, strOriginalAmount, strLocale) {
		var IS_CLIENT_CALL = JSUtil.notNil(this.getName());
		var SESSION_LOCALE = String(GlideLocale.get().getCurrent());

		var PARAMETER_SOURCECURRENCY = 
			IS_CLIENT_CALL ? 
			CurrencyUtils.AJAX_PARAMETER_SOURCECURRENCY : 
			CurrencyUtils.METHOD_PARAMETER_SOURCECURRENCY;

		var PARAMETER_TARGETCURRENCY = 
			IS_CLIENT_CALL ? 
			CurrencyUtils.AJAX_PARAMETER_TARGETCURRENCY : 
			CurrencyUtils.METHOD_PARAMETER_TARGETCURRENCY;

		var PARAMETER_ORGINALAMOUNT =  
			IS_CLIENT_CALL ? 
			CurrencyUtils.AJAX_PARAMETER_ORIGINALAMOUNT : 
			CurrencyUtils.METHOD_PARAMETER_ORIGINALAMOUNT;

		var PARAMETER_LOCALE = IS_CLIENT_CALL ? 
			CurrencyUtils.AJAX_PARAMETER_LOCALE : 
			CurrencyUtils.METHOD_PARAMETER_LOCALE;

		var _getReturnObject = function() {
			var _objReturn = {
				error_message:    String(arguments[0] || ''),
				source_currency:  String(arguments[1] || ''),
				target_currency:  String(arguments[2] || ''),
				original_amount:  String(arguments[3] || ''),
				converted_amount: String(arguments[4] || ''),
				exchange_rate:    String(arguments[5] || ''),
				used_locale:      String(arguments[6] || '')
			};

			var _strReturn = JSON.stringify(_objReturn);

			LogHelper.debug(CurrencyUtils.METHOD_CONVERT, 'Return Values: {0}', _strReturn);

			return IS_CLIENT_CALL ? _strReturn : _objReturn;
		};

		try {
			var _strSourceCurrency = 
				String(strSourceCurrency || this.getParameter(CurrencyUtils.AJAX_PARAMETER_SOURCECURRENCY)).trim();

			var _strTargetCurrency = 
				String(strTargetCurrency || this.getParameter(CurrencyUtils.AJAX_PARAMETER_TARGETCURRENCY)).trim();

			var _strOriginalAmount = 
				String(strOriginalAmount || this.getParameter(CurrencyUtils.AJAX_PARAMETER_ORIGINALAMOUNT)).trim();

			var _strLocale = 
				String(
					strLocale || this.getParameter(CurrencyUtils.AJAX_PARAMETER_LOCALE) || SESSION_LOCALE
				).trim();


			LogHelper.debug(
				CurrencyUtils.METHOD_CONVERT,
				'Entering method with:\n<{0}> = >{1}<\n<{2}> = >{3}<\n<{4}> = >{5}<\n<{6}> = >{7}<',
				PARAMETER_SOURCECURRENCY, _strSourceCurrency, 
				PARAMETER_TARGETCURRENCY, _strTargetCurrency, 
				PARAMETER_ORGINALAMOUNT, _strOriginalAmount,
				PARAMETER_LOCALE, _strLocale
			);

			// source currencey code is not valid
			if (!this._isValidCurrencyCode(_strSourceCurrency)) {
				return _getReturnObject(
					LogHelper.error(
						CurrencyUtils.METHOD_CONVERT, 
						'>{0}< is not a valid currency code at <{1}>!',
						_strSourceCurrency, PARAMETER_SOURCECURRENCY
					)
				);
			}

			// target currencey code is not valid
			if (!this._isValidCurrencyCode(_strTargetCurrency)) {
				return _getReturnObject(
					LogHelper.error(
						CurrencyUtils.METHOD_CONVERT, 
						'>{0}< is not a valid currency code at <{1}>!',
						_strTargetCurrency, PARAMETER_TARGETCURRENCY
					)
				);
			}

			// locale has not the required format
			if (!new RegExp('^[a-z]{2}_[A-Z]{2}$').test(_strLocale)) {
				return _getReturnObject(
					LogHelper.error(
						CurrencyUtils.METHOD_CONVERT, 
						'Value >{0}< at <{1}> does not represent a valid format for a locale identifier!',
						_strLocale, PARAMETER_LOCALE)
				);                
			}

			// normalize amount to english format
			var _strNormalizedOriginalAmount = this._getNormalizedNumber(_strOriginalAmount, _strLocale);

			// amount is not a valid number for the given locale
			if (_strNormalizedOriginalAmount === null) {
				return _getReturnObject(
					LogHelper.error(
						CurrencyUtils.METHOD_CONVERT, 
						'Value >{0}< at <{1}> does not represent a valid number for the locale >{2}<!',
						_strOriginalAmount, PARAMETER_ORGINALAMOUNT, _strLocale)
				);
			}

			// preconfigure the currency converter
			var gcvConverter = new sn_currency.GlideCurrencyConverter(_strSourceCurrency, _strTargetCurrency);

			// set the value to be converted
			gcvConverter.setAmount(_strNormalizedOriginalAmount);

			// perform currency conversion
			var _gcevConversionResult = gcvConverter.convert();

			// something went wrong
			if (_gcevConversionResult === null) {
				return _getReturnObject(
					LogHelper.warn(
						CurrencyUtils.METHOD_CONVERT, 
						'Value >{0}< for orignal currency >{1}< could not be converted to target currency >{2}<',
						_strOriginalAmount, _strSourceCurrency, _strTargetCurrency
					)
				);
			}


			return _getReturnObject(
				'',
				_strSourceCurrency, 
				_strTargetCurrency, 
				_strOriginalAmount, 
				this._getDenormalizedNumber(_gcevConversionResult.getAmount(), _strLocale),
				this._getDenormalizedNumber(_gcevConversionResult.getRate(), _strLocale, 6),
				_strLocale
			);
		}
		catch (e) {
			return _getReturnObject(
				LogHelper.fatal(CurrencyUtils.METHOD_CONVERT, 'Unexpected error!', e)
			);
		}
	},


	/**
	 * Checks whether the given parameter value is a valid 3-letter currency code defined by ISO 4217.
	 *
	 * @param {String} strCurrencyCode Currency code as a 3-letter value defined by ISO 4217.
	 * @return {boolean} `true` if passed cvurrency code is valid otherwise `false`.
	 */
	_isValidCurrencyCode: function(strCurrencyCode) {
		try {
			var _gcp = new sn_currency.GlideCurrencyParser(); 

			_gcp.setDefaultCurrencyCode(strCurrencyCode);
			_gcp.parse("1");

			return true;
		}
		catch (e) {
			return false;
		}
	},

	/**
     * Based on the locale the passed number at `strNumber` is converted to the English notation for numbers
     * with a dot as decimal separator and commas as grouping separator.
     * 
     * @param {String} strNumber Number to be converted based on the given locale.
     * @param {String} strLocale Considered locale when interpreting the number.
     * @return {String} Converted number in case a conversion was necessary. If not, the same number as 
     * passed will be returned.
     */
	_getNormalizedNumber: function(strNumber, strLocale) { 
		var _gcpParser = new sn_currency.GlideCurrencyParser();
		var _arrLocale = strLocale.split('_');

		try {
			_gcpParser.setLocale(_arrLocale[0], _arrLocale[1]); 
			_gcpParser.setDefaultCurrencyCode("USD");

			var _gcvParsedValue = _gcpParser.parse(strNumber); 

			return _gcvParsedValue.getAmount();
		}
		catch (e) {
			return null;
		}
	},

	/**
     * Based on the locale the passed number at `strNumber` is converted to the English notation for numbers
     * with a dot as decimal separator and commas as grouping separator.
     * 
     * @param {String} strNumber Number to be converted based on the locale.
     * @param {String} strLocale Considered locale when converting the number.
     * @param {Number} [numFractionDigits] Optional number of digits after the decimal sign.
     * @return {String} Converted number in case a conversion was necessary. If not, the same number as 
     * passed will be returned.
     */
	_getDenormalizedNumber: function(strNumber, strLocale, numFractionDigits) {
		try {
			var _gcfCurrencyFormatter = new sn_currency.GlideCurrencyFormatter("%v");
			var _arrLocale            = strLocale.split('_');
			var _parsedInt            = parseInt(numFractionDigits, 10);
			var _numFractionDigits    = isNaN(_parsedInt) ? 2 : Math.abs(_parsedInt);

			_gcfCurrencyFormatter.setLocale(_arrLocale[0], _arrLocale[1]); 

			return _gcfCurrencyFormatter.setMaxFractionDigits(_numFractionDigits).format(strNumber, 'USD');
		}
		catch (e) {
			return null;
		}
	},

	type: 'CurrencyUtils'
});
