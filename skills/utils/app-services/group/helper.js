// Helper Functions for Create Lunch Group Services
const Q = require('q');
const CiscoSpark = require('node-ciscospark');
const spark = new CiscoSpark(process.env.ACCESS_TOKEN);

/* LOAD CLIENTS/MODULES */
const CommonService = require('./../../common');

var service = {};

service.ValidateInput = ValidateInput;
service.GetPersonDetails = GetPersonDetails;
service.FormatMembers = FormatMembers;
service.SendInvite = SendInvite;

module.exports = service;

/* ENVIRONMENT VARIABLES */
const EMAIL_DOMAIN = process.env.EMAIL_DOMAIN;

/* Helper function which returns list of valid CECs from input list */
function validateCECs(cecs) {
  return new Promise(async (resolve) => {
    var valid_cecs = [];
    let unique_cecs = [...new Set(cecs)];
    for (var idx = 0; idx < unique_cecs.length; idx++) {
      var res = await CommonService.GetPersonByCEC(unique_cecs[idx]);
      if (res.items.length != 0) valid_cecs.push(unique_cecs[idx]);
    }
    resolve(valid_cecs);
  });
}

/* Helper function to format group members from array to JSON entries in PostgreSQL */
function FormatMembers(admin, members) {
  var json_members = [];
  for (var idx = 0; idx < members.length; idx++) {
    var member = {
      cec: members[idx],
      status: (admin.cec == members[idx]) ? 'accepted' : 'pending',
      admin: (admin.cec == members[idx]) ? true : false
    };
    json_members.push(member);
  }
  return json_members;
}

/* Function validates group command */
function ValidateInput(input) {
  return new Promise(async (resolve) => {
    var response = {};
    var input_arr = input.trim().replace(/[^\x00-\x7F]/g, "").split(' ');
    // Initial sanitation cases
    if (input_arr.length < 2) { // testing value = 2, prod value = 3
      response.valid = false;
      response.message = 'Usage: group [ group_name cec1 cec2 ]. E.g. group hogwarts hpotter rweasley. Two or more CECs required.';
    } else {
      var group_name = input_arr[0];
      var cecs = input_arr.slice(1, input_arr.length);
      valid_members = await validateCECs(cecs);
      // Members validation cases
      if (valid_members.length < 1) { // testing value = 1, prod value = 2
        response.valid = false;
        response.message = 'Two or more valid CECs are required. Please check your inputs and try again.';
      } else {
        response.valid = true;
        response.group_name = group_name;
        response.group_members = valid_members;
      }
    }
    resolve(response);
  });
}

/* Helper function to retrieve admin of lunch group's details */
function GetPersonDetails(id) {
  return new Promise(resolve => {
    var details = {};
    spark.people.get(id, function(err, res) {
      if (err) throw err;
      var data = JSON.parse(res);
      details.name = data.displayName;
      var personEmail = data.emails.filter(email => email.includes(EMAIL_DOMAIN))[0];
      details.cec = personEmail.split(EMAIL_DOMAIN)[0];
      resolve(details);
    });
  });
}

/* Helper function to notify pending members that they have been invited to join a lunch group */
function SendInvite(group_name, admin_name, pending_members) {
  for (var idx = 0; idx < pending_members.length; idx++) {
    var params = {
      toPersonEmail: pending_members[idx].cec + EMAIL_DOMAIN,
      markdown: admin_name + ' invites you to join the ' + group_name + ' lunch group!' +
      '\n\nTo accept, reply with: `join ' + group_name + '`'
    }
    spark.messages.create(params, function(err) {
      if (err) console.error(err);
    });
  }
}
