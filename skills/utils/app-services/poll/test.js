/* LOAD CLIENTS/MODULES */
const CommonService = require('./../../common');

/* Helper service to write text string of poll results displayed back to user */
function TestBuildResultsText(results_obj) {
  // Initialisation
  var text = '';
  var question_day = '';

  // Determine which day is in question for the poll
  CommonService.IsItAfter12PM() ? question_day = 'tomorrow' : question_day = 'today';

  // Members yet to complete poll section
  // var in_progress_pollers = await getPollersInProgress(group_name);
  var in_progress_pollers = [];
  if (in_progress_pollers.length != 0) {
    text += '\n\u{1f937} Yet to complete poll:\n';
    in_progress_pollers.forEach(poller => {
      text += '- ' + poller + '\n';
    });
  }

  // Filtered results arrays
  const in_for_lunch_arr = results_obj.filter(obj => (obj.result[0].in_for_lunch && !in_progress_pollers.includes(obj.name)));
  const in_the_office_arr = results_obj.filter(obj => (obj.result[0].in_the_office && !obj.result[0].in_for_lunch && !in_progress_pollers.includes(obj.name)));
  const out_of_office_arr = results_obj.filter(obj => (!obj.result[0].in_the_office && !in_progress_pollers.includes(obj.name)));
  const comments_arr = results_obj.filter(obj => (obj.result[0].comments.length != 0 && !in_progress_pollers.includes(obj.name)));

  // Booleans
  const noone_is_in_the_office = (results_obj.length == out_of_office_arr.length) && (in_progress_pollers.length == 0);
  const noone_is_in_for_lunch = (in_for_lunch_arr.length == 0) && (in_progress_pollers.length == 0);
  const everyone_is_in_for_lunch = (results_obj.length == in_for_lunch_arr.length) && (in_progress_pollers.length == 0);
  const everyone_is_in_the_office = (results_obj.length == in_the_office_arr.length) && (in_progress_pollers.length == 0);

  // Noone being in statements
  if (noone_is_in_for_lunch) {
    text += '\nNo-one is free for lunch ' + question_day + ' \u{1f63f}\n';
  } else if (noone_is_in_the_office) {
    text += '\nNo-one is in the office ' + question_day + ' \u{1f63f}\n';
  }
  // Everyone being in statements
  if (everyone_is_in_for_lunch) {
    text += '\nEveryone is free for lunch ' + question_day + '!\u{1f603}\n';
  } else if (everyone_is_in_the_office) {
    text += '\nEveryone is in the office ' + question_day + '! \u{1f4aa}\n';
  }
  // In for lunch section
  if (in_for_lunch_arr.length != 0 && !everyone_is_in_for_lunch) {
    text += '\n\u{1f37d} In For Lunch:\n';
    in_for_lunch_arr.forEach(obj => {
      text += '- ' + obj.name + '\n';
    });
  }
  // In the office but not in for lunch section
  if (in_the_office_arr.length != 0 && !noone_is_in_the_office) {
    text += '\n\u{1f3e2} In The Office But Not Free For Lunch:\n';
    in_the_office_arr.forEach(obj => {
      text += '- ' + obj.name + '\n';
    });
  }
  // Out of office section
  if (out_of_office_arr.length != 0 && !noone_is_in_the_office) {
    text += '\n\u{1f3d6} Out Of Office:\n';
    out_of_office_arr.forEach(obj => {
      text += '- ' + obj.name + '\n';
    });
  }
  // Comments section
  if (comments_arr.length != 0) {
    text += '\n\u{1f4ac} Comments:\n';
    comments_arr.forEach(obj => {
      text += '- ' + obj.name + ' says: ' + obj.result[0].comments + '\n';
    });
  }
  // Everyone completed poll section
  if (in_progress_pollers.length == 0) {
    text += '\nEveryone has completed the poll for ' + question_day + ' \u{1f4af}\n';
  }

  return text;
}

var test_obj1 = [
  {
    name: 'user1',
    result: [{
      in_the_office: true,
      in_for_lunch: false,
      comments: 'user1 comment'
    }]
  },
  {
    name: 'user2',
    result: [{
      in_the_office: true,
      in_for_lunch: false,
      comments: 'user2 comment'
    }]
  },
  {
    name: 'user3',
    result: [{
      in_the_office: true,
      in_for_lunch: true,
      comments: 'user3 comment'
    }]
  }
];

text = TestBuildResultsText(test_obj1);
console.log(text);
