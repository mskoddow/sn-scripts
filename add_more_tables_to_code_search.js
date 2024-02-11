var _grSearchGroup = new GlideRecord('sn_codesearch_search_group');

_grSearchGroup.query();

while (_grSearchGroup.next()) {
    var _strSearchGroupSysID = _grSearchGroup.getValue('sys_id');
    var _grDictionary        = new GlideRecord('sys_dictionary');
    var _objArrayUtil        = new ArrayUtil();

    _grDictionary.addEncodedQuery(
            'internal_type.nameINscript,condition,condition_string,script_plain,XML,script_server' +
        '^NQ' +
            'elementSTARTSWITHscript' +
                '^ORelementLIKE_script' +
            '^internal_type.nameSTARTSWITHstring' +
                '^ORinternal_type.name=json' +
        '^NQ' +
            'name=sys_variable_value^element=value' +
        '^NQ' +
            'nameSTARTSWITHsys_dictionary' +
            '^elementINattributes,default_value,reference_qual,calculation'
    );

    _grDictionary.query();

    while (_grDictionary.next()) {
        var _grCodeSearch = new GlideRecord('sn_codesearch_table');
        var _strTable     = _grDictionary.getValue('name');
        var _strField     = _grDictionary.getValue('element');

        _grCodeSearch.addQuery('table', _strTable);
        _grCodeSearch.addQuery('search_group', _strSearchGroupSysID);
        _grCodeSearch.setLimit(1);
        _grCodeSearch.query();

        //for the respective table there is already a record available
        if (_grCodeSearch.next()) {
            var _arrFields = _grCodeSearch.getValue('search_fields').split(',');

            _arrFields.push(_strField);

            _grCodeSearch.setValue('search_fields', _objArrayUtil.unique(_arrFields).join(','));
            _grCodeSearch.update();
        }
        // create a new record at table "sn_codesearch_table"
        else {
            _grCodeSearch.initialize();
            _grCodeSearch.setValue('table', _strTable);
            _grCodeSearch.setValue('search_group', _strSearchGroupSysID);
            _grCodeSearch.setValue('search_fields', _strField);
            _grCodeSearch.insert();
        }
    }
}
