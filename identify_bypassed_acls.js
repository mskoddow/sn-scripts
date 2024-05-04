//identifiy all record ACLs with the "snc_internal" or "snc_external" role
//as well as any additional roles
var _grAcl = new GlideRecord('sys_security_acl');

_grAcl.addEncodedQuery(
    'active=true' +
    '^type=record' +
    '^RLQUERYsys_security_acl_role.sys_security_acl,>=1,m2m^sys_user_role.nameINsnc_internal,snc_external^ENDRLQUERY'
);
_grAcl.query();

while (_grAcl.next()) {
    var _grAclRole          = new GlideRecord('sys_security_acl_role');
    var _arrAdditionalRoles = [];

    _grAclRole.addQuery('sys_security_acl', _grAcl.getUniqueValue());
    _grAclRole.addQuery('sys_user_role.name', 'NOT IN', ['snc_internal','snc_external']);
    _grAclRole.query();

    while (_grAclRole.next()) {
        var _strRoleName = _grAclRole.sys_user_role.name.toString();

        if (_arrAdditionalRoles.indexOf(_strRoleName) === -1) {
            _arrAdditionalRoles.push(_strRoleName);
        }
    }

    if (_arrAdditionalRoles.length > 0) {
        gs.print(_grAcl.getValue('name') + ': '+ _grAcl.getUniqueValue() + ': ' + _arrAdditionalRoles);
    }
}
