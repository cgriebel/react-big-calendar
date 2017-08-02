import PropTypes from 'prop-types';
import React, { Component } from 'react';
import cn from 'classnames';
import { findDOMNode } from 'react-dom';

import dates from './utils/dates';
import DayColumn from './_DayColumn';
import Selection, { getBoundsForNode, isEvent, objectsCollide } from './_Selection';

import { accessor, dateFormat } from './utils/propTypes';

import { notify } from './utils/helpers';

import { accessor as get } from './utils/accessors';

import { segStyle } from './utils/eventLevels';

export default class TimeGrid extends Component {

  static propTypes = {
    events: PropTypes.array.isRequired,

    step: PropTypes.number,
    range: PropTypes.arrayOf(
      PropTypes.instanceOf(Date)
    ),
    min: PropTypes.instanceOf(Date),
    max: PropTypes.instanceOf(Date),
    now: PropTypes.instanceOf(Date),

    scrollToTime: PropTypes.instanceOf(Date),
    eventPropGetter: PropTypes.func,
    dayFormat: dateFormat,
    culture: PropTypes.string,

    rtl: PropTypes.bool,
    width: PropTypes.number,

    titleAccessor: accessor.isRequired,
    allDayAccessor: accessor.isRequired,
    startAccessor: accessor.isRequired,
    endAccessor: accessor.isRequired,

    selected: PropTypes.object,
    selectable: PropTypes.oneOf([true, false, 'ignoreEvents']),

    onNavigate: PropTypes.func,
    onSelectSlot: PropTypes.func,
    onSelectEnd: PropTypes.func,
    onSelectStart: PropTypes.func,
    onSelectEvent: PropTypes.func,
    onDrillDown: PropTypes.func,
    getDrilldownView: PropTypes.func.isRequired,

    messages: PropTypes.object,
    components: PropTypes.object.isRequired,

    groups: PropTypes.arrayOf(PropTypes.shape({
     description: PropTypes.string,
     value: PropTypes.any
    })),

    container: PropTypes.func,
  }

  static defaultProps = {
    step: 30,
    min: dates.startOf(new Date(), 'day'),
    max: dates.endOf(new Date(), 'day'),
    scrollToTime: dates.startOf(new Date(), 'day'),
    now: new Date()
  }

  constructor(props) {
    super(props)
    this.state = { selecting: false, selectedDays: [] };
    this.handleSelectEvent = this.handleSelectEvent.bind(this)
  }

  componentDidMount() {
    this.props.selectable
        && this._selectable()
  }

  componentWillUnmount() {
    this._teardownSelectable();
  }

  _selectable = () => {
    let node = findDOMNode(this);
    let selector = this._selector = new Selection(this.props.container);
    let bounds;

    let maybeSelect = (box) => {
      const selected = selector.isSelected(node);
      const selectedDays = [];
      if(!this.state.selecting){
        bounds = getBoundsForNode(node);
      }
      if(selected){
        const { range } = this.props;
        // do something to color events
        const width = bounds.right - bounds.left;
        const dayWidth = width / range.length;

        for(var i = 0; i < range.length; i++){
            const dayBounds = {
                ...bounds,
                left: bounds.left + (i * dayWidth),
                right: bounds.left + ((i + 1) * dayWidth)
            };
            if(objectsCollide(box, dayBounds))
            {
                selectedDays[i] = true;
            }
        }
      }
      this.setState({ selecting: selected, selectedDays });
    }

    // let selectionState = ({ y }) => {
    //   let { step, min, max } = this.props;
    //   let { top, bottom } = getBoundsForNode(node)

    //   let mins = this._totalMin;

    //   let range = Math.abs(top - bottom)

    //   let current = (y - top) / range;

    //   current = snapToSlot(minToDate(mins * current, min), step)

    //   if (!this.state.selecting)
    //     this._initialDateSlot = current

    //   let initial = this._initialDateSlot;

    //   if (dates.eq(initial, current, 'minutes'))
    //     current = dates.add(current, step, 'minutes')

    //   let start = dates.max(min, dates.min(initial, current))
    //   let end = dates.min(max, dates.max(initial, current))

    //   return {
    //     selecting: true,
    //     startDate: start,
    //     endDate: end,
    //     startSlot: positionFromDate(start, min, this._totalMin),
    //     endSlot: positionFromDate(end, min, this._totalMin)
    //   }
    // }

    selector.on('selecting', maybeSelect)
    selector.on('selectStart', maybeSelect)

    selector.on('mousedown', (box) => {
      if (this.props.selectable !== 'ignoreEvents') return

      return !isEvent(findDOMNode(this), box)
    })

    selector
      .on('click', (box) => {
        // if (!isEvent(findDOMNode(this), box))
        //   this._selectSlot({ ...selectionState(box), action: 'click' })

        this.setState({ selecting: false })
      })

    selector
      .on('select', () => {
        if (this.state.selecting) {
          // this._selectSlot({ ...this.state, action: 'select' })
          this.setState({ selecting: false })
        }
      })
  };

  _teardownSelectable = () => {
    if (!this._selector) return
    this._selector.teardown();
    this._selector = null;
  };

  handleSelectAllDaySlot = (slots, slotInfo) => {
    const { onSelectSlot } = this.props;
    notify(onSelectSlot, {
      slots,
      start: slots[0],
      end: slots[slots.length - 1],
      action: slotInfo.action
    })
  }

  render() {
    let {
        events
      , range
      , now } = this.props;

    return (
      <div className="rbc-date-grid">
          {this.renderEvents(range, events, now)}
      </div>
    );
  }

  renderEvents(range, events, today){
    let { min, max, endAccessor, startAccessor, components } = this.props;
    return range.map((date, idx) => {
      let daysEvents = events.filter(
        event => dates.inRange(date,
          get(event, startAccessor),
          get(event, endAccessor), 'day')
      )

      return (
        <DayColumn
          {...this.props }
          min={dates.merge(date, min)}
          max={dates.merge(date, max)}
          eventComponent={components.event}
          eventWrapperComponent={components.eventWrapper}
          dayWrapperComponent={components.dayWrapper}
          className={cn({
              'rbc-now': dates.eq(date, today, 'day'),
              'selected': this.state.selectedDays[idx]
            })}
          style={segStyle(1, this.slots)}
          key={idx}
          date={date}
          events={daysEvents}
          container={this.getContainer}
        />
      )
    })
  }

  getContainer = () => findDOMNode(this);

  handleHeaderClick(date, view, e){
    e.preventDefault()
    notify(this.props.onDrillDown, [date, view])
  }

  handleSelectEvent(...args) {
    notify(this.props.onSelectEvent, args)
  }

  handleSelectAlldayEvent(...args) {
    //cancel any pending selections so only the event click goes through.
    this.clearSelection()
    notify(this.props.onSelectEvent, args)
  }

  clearSelection(){
    clearTimeout(this._selectTimer)
    this._pendingSelection = [];
  }
}
