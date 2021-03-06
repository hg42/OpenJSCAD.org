const withLatestFrom = require('./withLatestFrom')
/*
  state    ---> A ------> B ---> c -->
  source   --------> C -------------->
  expected --------> A -> B ---> c -->

  ideal:
  state$.thru(holdUntil(signal$))
  // what we want
// every time state changes => output to out$
// but ONLY after at least one event got through storeSource
*/
const holdUntil = (startSignal) => {
  return stream => {
    return stream.skipUntil(startSignal)
      .merge(
        startSignal.take(1).thru(withLatestFrom(x => x, stream))
      )
  }
}

module.exports = holdUntil
