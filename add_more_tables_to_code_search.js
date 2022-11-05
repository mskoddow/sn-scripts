// Execute the following code in the "Scripts - Background" console

var grSearchGroup = new GlideRecord('sn_codesearch_search_group');

//get reference to default code search
if (grSearchGroup.get('name',  'sn_codesearch.Default Search Group')) {
    var grDictionary        = new GlideRecord('sys_dictionary');
    var strSearchGroupSysID = grSearchGroup.getValue('sys_id');
    var objArrayUtil        = new ArrayUtil();
  
	//retrieve all potential script-related fields from "global" scope
    grDictionary.addEncodedQuery(
        'sys_scope=global^' + 
		'internal_type.nameINscript,condition,condition_string,script_plain,XML,script_server' +
        '^ORelement=reference_qual^ORelement=calculation' + 
        '^nameNOT LIKEvar__m_' + 
        '^NQelementSTARTSWITHscript' + 
        '^ORelementLIKE_script' +
        '^internal_type.nameSTARTSWITHstring' +
        '^nameNOT LIKEvar__m_' +
        '^NQname=sys_variable_value^element=value'
    );
    
    grDictionary.query();

    while (grDictionary.next()) {
        var grCodeSearch = new GlideRecord('sn_codesearch_table');
        var strTable     = grDictionary.getValue('name');
        var strField     = grDictionary.getValue('element');

        grCodeSearch.addQuery('table', strTable);
        grCodeSearch.addQuery('search_group', strSearchGroupSysID);
        grCodeSearch.setLimit(1);
        grCodeSearch.query();

		//for the respective table there is already a record available
        if (grCodeSearch.next()) {
            var arrFields = grCodeSearch.getValue('search_fields').split(',');

            arrFields.push(strField);

            grCodeSearch.setValue('search_fields', objArrayUtil.unique(arrFields).join(','));
            grCodeSearch.update();
        }
		// create a new record at table "sn_codesearch_table"
        else {
            grCodeSearch.initialize();
            grCodeSearch.setValue('table', strTable);
            grCodeSearch.setValue('search_group', strSearchGroupSysID);
            grCodeSearch.setValue('search_fields', strField);
            grCodeSearch.insert();
        }
    }
}
else {
	gs.error('Default search group "sn_codesearch.Default Search Group" not available!');
}
