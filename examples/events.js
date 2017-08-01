export const groups = [
  {
    description: 'Tim',
    value: 1
  },
  {
    description: 'Joe',
    value: 2
  },
  {
    description: 'Chris',
    value: 3
  },
];

export default [
  {
    'title': 'All Day Event',
    'allDay': true,
    'start': new Date(2015, 3, 0),
    'end': new Date(2015, 3, 1),
    group: 1
  },
  {
    'title': 'Long Event',
    'start': new Date(2015, 3, 7),
    'end': new Date(2015, 3, 10)
  },

  {
    'title': 'DTS STARTS',
    'start': new Date(2016, 2, 13, 0, 0, 0),
    'end': new Date(2016, 2, 20, 0, 0, 0)
  },

  {
    'title': 'DTS ENDS',
    'start': new Date(2016, 10, 6, 0, 0, 0),
    'end': new Date(2016, 10, 13, 0, 0, 0)
  },

  {
    'title': 'Some Event',
    'start': new Date(2015, 3, 9, 0, 0, 0),
    'end': new Date(2015, 3, 9, 0, 0, 0)
  },
  {
    'title': 'Conference',
    'start': new Date(2015, 3, 11),
    'end': new Date(2015, 3, 13),
    desc: 'Big conference for important people'
  },
  {
    'title': 'Meeting',
    'start': new Date(2015, 3, 12, 10, 30, 0, 0),
    'end': new Date(2015, 3, 12, 12, 30, 0, 0),
    desc: 'Pre-meeting meeting, to prepare for the meeting',
    group: 1
  },
  {
    'title': 'Lunch',
    'start':new Date(2015, 3, 12, 6, 0, 0, 0),
    'end': new Date(2015, 3, 12, 14, 0, 0, 0),
    desc: 'Power lunch',
    group: 2
  },
  {
    'title': 'Meeting',
    'start':new Date(2015, 3, 12, 14, 0, 0, 0),
    'end': new Date(2015, 3, 12, 15, 0, 0, 0),
    group: 1
  },
  {
    'title': 'Happy Hour',
    'start':new Date(2015, 3, 12, 9, 0, 0, 0),
    'end': new Date(2015, 3, 12, 17, 30, 0, 0),
    desc: 'Most important meal of the day',
    group: 3,
    groupName: 'Default, Programmer'
  },
  {
    'title': 'Dinner',
    'start':new Date(2015, 3, 12, 20, 0, 0, 0),
    'end': new Date(2015, 3, 12, 21, 0, 0, 0)
  },
  {
    'title': 'Birthday Party',
    'start':new Date(2015, 3, 13, 7, 0, 0),
    'end': new Date(2015, 3, 13, 10, 30, 0)
  }
]
