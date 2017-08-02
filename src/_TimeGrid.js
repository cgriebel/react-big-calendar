import PropTypes from 'prop-types';
import React, { Component } from 'react';
import cn from 'classnames';
import { findDOMNode } from 'react-dom';

import dates from './utils/dates';
import localizer from './localizer'
import DayColumn from './_DayColumn';
import DateContentGrid from './_DateContentGrid';
import DateContentRow from './_DateContentRow';
import Header from './Header';
import Selection, { getBoundsForNode, isEvent } from './_Selection';

import getWidth from 'dom-helpers/query/width';
import scrollbarSize from 'dom-helpers/util/scrollbarSize';
import message from './utils/messages';

import { accessor, dateFormat } from './utils/propTypes';

import { notify } from './utils/helpers';

import { accessor as get } from './utils/accessors';

import { inRange, sortEvents, segStyle } from './utils/eventLevels';

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
    }))
  }

  static defaultProps = {
    step: 30,
    min: dates.startOf(new Date(), 'day'),
    max: dates.endOf(new Date(), 'day'),
    scrollToTime: dates.startOf(new Date(), 'day'),
    /* these 2 are needed to satisfy requirements from TimeColumn required props
     * There is a strange bug in React, using ...TimeColumn.defaultProps causes weird crashes
     */
    type: 'gutter',
    now: new Date()
  }

  constructor(props) {
    super(props)
    this.state = { gutterWidth: undefined, isOverflowing: null };
    this.handleSelectEvent = this.handleSelectEvent.bind(this)
    this.handleHeaderClick = this.handleHeaderClick.bind(this)
  }

  componentWillMount() {
    this._gutters = [];
    this.calculateScroll();
  }

  componentDidMount() {
    this.checkOverflow();

    if (this.props.width == null) {
      this.measureGutter()
    }
    this.applyScroll();

    this.positionTimeIndicator();
    this.triggerTimeIndicatorUpdate();

    // this.props.selectable
    // && this._selectable()
  }

  componentWillUnmount() {
    window.clearTimeout(this._timeIndicatorTimeout);
    // this._teardownSelectable();
  }

  _selectable = () => {
    let node = findDOMNode(this);
    let selector = this._selector = new Selection(() => node);
    let bounds;

    let maybeSelect = (box) => {
      const selected = selector.isSelected(node);
      if(!this.state.selecting){
        bounds = getBoundsForNode(node);
      }
      if(selected){
        // do something to color events
      }
      this.setState({ selecting: selected });
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

  componentDidUpdate(prevProps) {
    if (this.shouldUpdateGutter(this.props, prevProps))
    {
      this.measureGutter()
    }

    this.applyScroll();
    this.positionTimeIndicator();
    //this.checkOverflow()
  }

  componentWillReceiveProps(nextProps) {
    const { range, scrollToTime } = this.props;
    if(this.shouldUpdateGutter(this.props, nextProps))
    {
      this.setState({ gutterWidth: undefined })
    }
    // When paginating, reset scroll
    if (
      !dates.eq(nextProps.range[0], range[0], 'minute') ||
      !dates.eq(nextProps.scrollToTime, scrollToTime, 'minute')
    ) {
      this.calculateScroll();
    }
  }

  shouldUpdateGutter(props, otherProps){
    return props.width == null
            && (
              props.range[0].getTime() !== otherProps.range[0].getTime()
              || props.groups != otherProps.groups
            )
  }

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
      , width
      , startAccessor
      , endAccessor
      , allDayAccessor } = this.props;

    width = width || this.state.gutterWidth;

    let start = range[0]
      , end = range[range.length - 1]

    this.slots = range.length;

    let allDayEvents = []
      , rangeEvents = [];

    events.forEach(event => {
      if (inRange(event, start, end, this.props)) {
        let eStart = get(event, startAccessor)
          , eEnd = get(event, endAccessor);

        if (
          get(event, allDayAccessor)
          || !dates.eq(eStart, eEnd, 'day')
          || (dates.isJustDate(eStart) && dates.isJustDate(eEnd)))
        {
          allDayEvents.push(event)
        }
        else
          rangeEvents.push(event)
      }
    })

    allDayEvents.sort((a, b) => sortEvents(a, b, this.props))

    this._gutters = [];

    return (
      <div className='rbc-time-view'>

        {this.renderHeader(range, allDayEvents, width)}

        <div ref='content' className='rbc-time-content' style={{display: 'block'}}>
          {/* todo: remove these refs */}
          <div ref='timeIndicator' className='rbc-current-time-indicator' style={{display: 'none'}} />
          {this.renderEventGroups(range, rangeEvents, this.props.now, width)}
        </div>
      </div>
    );
  }

  renderEventGroups(range, events, today, width){
    let gutterRef = ref => this._gutters.push(ref && findDOMNode(ref));
    // todo: this only needs to be done once, clean it up
    const emptyGroups = this.props.groups.reduce((acc, group) => {
      acc[group.value] = [];
      acc[group.value].description = group.description;
      return acc;
    }, {});
    emptyGroups[undefined] = [];
    const groupedEvents =  events.reduce((acc, event)=>{
      acc[event.group].push(event)
      return acc;
    }, emptyGroups);
    if(emptyGroups[undefined].length == 0) delete emptyGroups[undefined]
    return Object.values(groupedEvents).map((eventGroup, i) =>
        <div
          style={{display: 'flex'}}
          className="rbc-event-group"
          key={i}
        >
          <div
            className = "rbc-event-group-label"
            style={{width, padding: '0 5px', flex: 'none'}}
            ref={gutterRef}
          >
            {eventGroup.description || ''}
          </div>
             <DateContentGrid
              {...this.props}
              range={range}
              events={eventGroup}
              now={today}
              container={this.getContainer}
            />
            {/* {this.renderEvents(range, eventGroup, today)} */}
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
          className={cn({ 'rbc-now': dates.eq(date, today, 'day') })}
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

  renderHeader(range, events, width) {
    let { messages, rtl, selectable, components, now } = this.props;
    let { isOverflowing } = this.state || {};

    let style = {};
    if (isOverflowing)
      style[rtl ? 'marginLeft' : 'marginRight'] = scrollbarSize() + 'px';

    return (
      <div
        ref='headerCell'
        className={cn(
          'rbc-time-header',
          isOverflowing && 'rbc-overflowing'
        )}
        style={style}
      >
        <div className='rbc-row'>
          <div
            className='rbc-label rbc-header-gutter'
            style={{ width }}
          />
          { this.renderHeaderCells(range) }
        </div>
        <div className='rbc-row'>
          <div
            ref={ref => this._gutters[0] = ref}
            className='rbc-label rbc-header-gutter'
            style={{ width }}
          >
            { message(messages).allDay }
          </div>
          <DateContentRow
            now={now}
            minRows={2}
            range={range}
            rtl={this.props.rtl}
            events={events}
            className='rbc-allday-cell'
            selectable={selectable}
            onSelectSlot={this.handleSelectAllDaySlot}
            dateCellWrapper={components.dateCellWrapper}
            eventComponent={this.props.components.event}
            eventWrapperComponent={this.props.components.eventWrapper}
            titleAccessor={this.props.titleAccessor}
            startAccessor={this.props.startAccessor}
            endAccessor={this.props.endAccessor}
            allDayAccessor={this.props.allDayAccessor}
            eventPropGetter={this.props.eventPropGetter}
            selected={this.props.selected}
            onSelect={this.handleSelectEvent}
          />
        </div>
      </div>
    )
  }

  renderHeaderCells(range){
    let { dayFormat, culture, components, getDrilldownView } = this.props;
    let HeaderComponent = components.header || Header

    return range.map((date, i) => {
      let drilldownView = getDrilldownView(date);
      let label = localizer.format(date, dayFormat, culture);

      let header = (
        <HeaderComponent
          date={date}
          label={label}
          localizer={localizer}
          format={dayFormat}
          culture={culture}
        />
      )

      return (
        <div
          key={i}
          className={cn(
            'rbc-header',
            dates.isToday(date) && 'rbc-today',
          )}
          style={segStyle(1, this.slots)}
        >
          {drilldownView ? (
            <a
              href='#'
              onClick={e => this.handleHeaderClick(date, drilldownView, e)}
            >
              {header}
            </a>
          ) : (
            <span>
              {header}
            </span>
          )}
        </div>
      )
    })
  }

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

  measureGutter() {
    let width = this.state.gutterWidth;

    if(!width)
    {
      let gutterCells = this._gutters;
      width = Math.max(...gutterCells.filter(g => g != null).map(gutterCell => Math.ceil(getWidth(gutterCell))));
    }

    if (width) {
      this.setState({ gutterWidth: width })
    }
  }

  applyScroll() {
    if (this._scrollRatio) {
      const { content } = this.refs;
      content.scrollTop = content.scrollHeight * this._scrollRatio;
      // Only do this once
      this._scrollRatio = null;
    }
  }

  calculateScroll() {
    const { min, max, scrollToTime } = this.props;

    const diffMillis = scrollToTime - dates.startOf(scrollToTime, 'day');
    const totalMillis = dates.diff(max, min);

    this._scrollRatio = diffMillis / totalMillis;
  }

  checkOverflow() {
    if (this._updatingOverflow) return;

    let isOverflowing = this.refs.content.scrollHeight > this.refs.content.clientHeight;

    if (this.state.isOverflowing !== isOverflowing) {
      this._updatingOverflow = true;
      this.setState({ isOverflowing }, () => {
        this._updatingOverflow = false;
      })
    }
  }

  positionTimeIndicator() {
    // const { rtl, min, max } = this.props
    // const now = new Date();

    // const secondsGrid = dates.diff(max, min, 'seconds');
    // const secondsPassed = dates.diff(now, min, 'seconds');

    const timeIndicator = this.refs.timeIndicator;
    // const factor = secondsPassed / secondsGrid;
    // const timeGutter = this._gutters[this._gutters.length - 1];

    // if (timeGutter && now >= min && now <= max) {
    //   const pixelHeight = timeGutter.offsetHeight;
    //   const offset = Math.floor(factor * pixelHeight);

    //   timeIndicator.style.display = 'block';
    //   timeIndicator.style[rtl ? 'left' : 'right'] = 0;
    //   timeIndicator.style[rtl ? 'right' : 'left'] = timeGutter.offsetWidth + 'px';
    //   timeIndicator.style.top = offset + 'px';
    // } else {
      timeIndicator.style.display = 'none';
    // }
  }

  triggerTimeIndicatorUpdate() {
    // Update the position of the time indicator every minute
    this._timeIndicatorTimeout = window.setTimeout(() => {
      this.positionTimeIndicator();

      this.triggerTimeIndicatorUpdate();
    }, 60000)
  }
}
