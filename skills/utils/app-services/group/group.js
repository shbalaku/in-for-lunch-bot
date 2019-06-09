// Lunch Group Services
const Q = require('q');

/* LOAD CLIENTS/MODULES */
const PostgreSQL = require('./../../postgres');
const HelperService = require('./helper');

var service = {};

service.CreateGroup = CreateGroup;
service.NotifyGroupJoin = NotifyGroupJoin;

module.exports = service;

/* Function notifies group members of lunch group */
function NotifyGroupJoin(group) {
  var pending_members = group.members.filter(member => member.status == 'pending');
  HelperService.SendInvite(group.name, group.admin.name, pending_members);
}

/* Function creates lunch group */
async function CreateGroup(query) {
  var deferred = Q.defer();

  var input = query.match[1];
  var adminId = query.data.personId;
  // Validate query
  var validity_resp = await HelperService.ValidateInput(input);

  if (validity_resp.valid) {
    // Table column entries
    var group_admin = await HelperService.GetPersonDetails(adminId);
    var group_members = HelperService.FormatMembers(group_admin, validity_resp.group_members);
    // Group object to return
    const group = {
      name: validity_resp.group_name,
      admin: group_admin,
      members: group_members.members
    };
    // Establish client POSTGRESQL
    const client = PostgreSQL.CreateClient();

    client.connect(function(err) {
      if (err) throw err;
      // create lunch group entry if group name is unique
      client.query('SELECT * FROM lunch_groups WHERE name = $1', [group.name], function(err, res) {
        if (err) throw err;
        if (res.rows.length == 0) {
          client.query('INSERT INTO lunch_groups VALUES ($1, $2);', [group.name, group_members], function(err) {
            if (err) throw err;
            client.end(function(err) {
              if (err) throw err;
              deferred.resolve(group);
            });
          });
        } else {
          client.end(function(err) {
            if (err) throw err;
            deferred.reject('Lunch group: "' + group.name + '" already exists. Please select another name.');
          });
        }
      });
    });
  } else {
    deferred.reject(validity_resp.message);
  }
  return deferred.promise;
}
