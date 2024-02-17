var _grRole = new GlideRecord('sys_user_role');

//retrieve all contained roles from the role hierarchy for the "admin" role
if (_grRole.get('name', 'admin')) {
	gs.info('Retrieve all contained roles for "{0}" ...', _grRole.name);
    
	var _itRoleSysIDs = 
        new SNC.RoleManagementAPI()
            .findAllContainedRolesForRole(_grRole.getUniqueValue())
            .iterator();

    while (_itRoleSysIDs.hasNext()) {
        var _strRoleSysID = String(_itRoleSysIDs.next());
    
        if (_grRole.get(_strRoleSysID)) {
            gs.info('-> {0} ({1})', _grRole.name, _strRoleSysID);
        }
    }
}
