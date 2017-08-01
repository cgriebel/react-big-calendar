import { views } from './utils/constants';
import Month from './Month';
import Day from './Day';
import Week from './Week';
import GroupedWeek from './_Week';
import WorkWeek from './WorkWeek';
import Agenda from './Agenda';

const VIEWS = {
  [views.MONTH]: Month,
  [views.WEEK]: Week,
  [views.GROUPED_WEEK]: GroupedWeek,
  [views.WORK_WEEK]: WorkWeek,
  [views.DAY]: Day,
  [views.AGENDA]: Agenda
};

export default VIEWS;
