import PropTypes from 'prop-types';
import React from 'react';
import { findDOMNode } from 'react-dom';
import cn from 'classnames';

import dates from './utils/dates';
import { segStyle } from './utils/eventLevels';
import { notify } from './utils/helpers';
import { elementType } from './utils/propTypes';
import { dayGroupedCellSelection, slotWidth, getCellAtX, pointInBox } from './utils/selection';
import Selection, { getBoundsForNode, isEvent } from './_Selection';

class BackgroundCells extends React.Component {

  static propTypes = {
    cellWrapperComponent: elementType,
    container: PropTypes.func,
    selectable: PropTypes.oneOf([true, false, 'ignoreEvents']),

    onSelectSlot: PropTypes.func.isRequired,
    onSelectEnd: PropTypes.func,
    onSelectStart: PropTypes.func,

    range: PropTypes.arrayOf(
      PropTypes.instanceOf(Date)
    ),
    rtl: PropTypes.bool,
    type: PropTypes.string,

    group: PropTypes.any
  }

  constructor(props, context) {
    super(props, context);

    this.state = {
      selecting: false
    };
  }

  componentDidMount(){
    this.props.selectable
      && this._selectable()
  }

  componentWillUnmount() {
    this._teardownSelectable();
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.selectable && !this.props.selectable)
      this._selectable();

    if (!nextProps.selectable && this.props.selectable)
      this._teardownSelectable();
  }

  render(){
    let { range, cellWrapperComponent: Wrapper } = this.props;
    let { selecting, startIdx, endIdx } = this.state;

    return (
      <div className='rbc-row-bg'>
        {range.map((date, index) => {
          let selected =  selecting && index >= startIdx && index <= endIdx;
          const style= segStyle(1, range.length);
          const className = cn(
            'rbc-day-bg',
            selected && 'rbc-selected-cell',
            dates.isToday(date) && 'rbc-today',
          );
          return (
            <Wrapper
              key={index}
              value={date}
              range={range}
              selected={selected}
              style={style}
                className={className}
            >
              <div
                style={style}
                className={className}
              />
            </Wrapper>
          )
        })}
      </div>
    )
  }

  _selectable(){
    let node = findDOMNode(this);
    let selector = this._selector = new Selection(this.props.container)

    selector.on('selecting', box => {
      let { range, rtl } = this.props;

      let startIdx = -1;
      let endIdx = -1;
      let isCurrent;
      let isStart;

      if (!this.state.selecting) {
        notify(this.props.onSelectStart, [box]);
        this._initial = { x: box.x, y: box.y };
      }
      if (selector.isSelected(node)) {
        let nodeBox = getBoundsForNode(node);

        ({ startIdx, endIdx, isCurrent, isStart } = dayGroupedCellSelection(
            this._initial
          , nodeBox
          , box
          , range.length
          , rtl));
      }

      this.setState({
        selecting: true,
        startIdx, endIdx,
        isCurrent, isStart
      })
    })

    selector.on('mousedown', (box) => {
      if (this.props.selectable !== 'ignoreEvents') return

      return !isEvent(findDOMNode(this), box)
    })

    selector
      .on('click', point => {
        if (!isEvent(findDOMNode(this), point)) {
          let rowBox = getBoundsForNode(node)
          let { range, rtl } = this.props;

          if (pointInBox(rowBox, point)) {
            let width = slotWidth(getBoundsForNode(node),  range.length);
            let currentCell = getCellAtX(rowBox, point.x, width, rtl, range.length);

            this._selectSlot({
              startIdx: currentCell,
              endIdx: currentCell,
              action: 'click',
              isStart: true,
              isCurrent: true
            })
          }
        }

        this._initial = {}
        this.setState({ selecting: false })
      })

    selector
      .on('select', () => {
        this._selectSlot({ ...this.state, action: 'select' })
        this._initial = {}
        this.setState({ selecting: false })
        notify(this.props.onSelectEnd, [this.state]);
      })
  }

  _teardownSelectable() {
    if (!this._selector) return
    this._selector.teardown();
    this._selector = null;
  }

  _selectSlot({ endIdx, startIdx, action, isStart, isCurrent }) {
    if (endIdx !== -1 && startIdx !== -1)
      this.props.onSelectSlot &&
        this.props.onSelectSlot({
          start: startIdx,
          end: endIdx,
          action,
          isStart,
          isCurrent,
          group: this.props.group,
        })
  }
}

export default BackgroundCells;
