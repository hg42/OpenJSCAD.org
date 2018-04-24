const most = require('most')
const getParameterValuesFromUIControls = require('../../core/parameters/getParameterValuesFromUIControls')

const actions = (sources) => {
  const designPath$ = most.mergeArray([
    sources.dom.select('#fileLoader').events('click')
      .map(function () {
        // literally an array of paths (strings)
        // like those returned by dialog.showOpenDialog({properties: ['openFile', 'openDirectory', 'multiSelections']})
        const paths = []
        return paths
      }),
    sources.fs
      .filter(data => data.type === 'read' && data.id === 'loadDesign')
      .tap(x => console.log('loadDesign', x))
      .map(raw => raw)
    /* sources.store
      .filter(data => data && data.design && data.design.mainPath)
      .map(data => data.design.mainPath)
      .filter(data => data !== '')
      .map(data => [data]), */
    /*sources.drops
      .filter(drop => drop.type === 'fileOrFolder' && drop.data.length > 0)
      // .map(drop => drop.data.map(fileOrFolder => fileOrFolder.path))
      .flatMap(x => {
        console.log('here', x)
        return sources.fs
          .tap(x => console.log('gnagna', x))
          .filter(data => data.type === 'read' && data.id === 'loadDesign')
          .map(raw => raw)
      })*/
  ])
    .filter(data => data !== undefined)
    .debounce(50)
    .multicast()

  const setDesignPath$ = designPath$
    .map(data => ({type: 'setDesignPath', data}))
    .delay(1)

  const setDesignContent$ = most.mergeArray([
    sources.fs
      .filter(data => data.type === 'read' && data.id === 'loadDesign')
      .map(raw => raw.data),
    sources.fs
      .filter(data => data.type === 'watch' && data.id === 'watchScript')
      .map(({path, data}) => data)
  ])
    .map(data => ({type: 'setDesignContent', data}))

  // design parameter change actions
  const getControls = () => Array.from(document.getElementById('paramsTable').getElementsByTagName('input'))
    .concat(Array.from(document.getElementById('paramsTable').getElementsByTagName('select')))

  const updateDesignFromParams$ = most.mergeArray([
    sources.dom.select('#updateDesignFromParams').events('click')
      .map(function () {
        const controls = getControls()
        const paramValues = getParameterValuesFromUIControls(controls)
        return {paramValues, origin: 'manualUpdate'}
      })
      .multicast(),
    sources.paramChanges.multicast().map(function (_controls) {
      try {
        const controls = getControls()
        const paramValues = getParameterValuesFromUIControls(controls)
        return {paramValues, origin: 'instantUpdate'}
      } catch (error) {
        return {error, origin: 'instantUpdate'}
      }
    })

  ])
    .map(data => ({type: 'updateDesignFromParams', data})).multicast()

  const setDesignSolids$ = most.mergeArray([
    sources.solidWorker
      .filter(event => !('error' in event))
      .filter(event => event.data instanceof Object)
      .filter(event => event.data.type === 'solids')
      .map(function (event) {
        try {
          if (event.data instanceof Object) {
            const { CAG, CSG } = require('@jscad/csg')
            const solids = event.data.solids.map(function (object) {
              if (object['class'] === 'CSG') { return CSG.fromCompactBinary(object) }
              if (object['class'] === 'CAG') { return CAG.fromCompactBinary(object) }
            })
            const {lookupCounts, lookup} = event.data
            return {solids, lookup, lookupCounts}
          }
        } catch (error) {
          return {error}
        }
      }),
    sources.fs
      .filter(res => res.type === 'read' && res.id === 'loadCachedGeometry' && res.data)
      .map(raw => {
        const deserialize = () => {}// require('serialize-to-js').deserialize
        const lookup = deserialize(raw.data)
        return {solids: undefined, lookupCounts: undefined, lookup}
      })
  ])
    .map(data => ({type: 'setDesignSolids', data}))

  const setDesignParams$ = most.mergeArray([
    sources.solidWorker
      .filter(event => !('error' in event))
      .filter(event => event.data instanceof Object)
      .filter(event => event.data.type === 'params')
      .map(function (event) {
        try {
          const {paramDefaults, paramValues, paramDefinitions} = event.data
          return {paramDefaults, paramValues, paramDefinitions}
        } catch (error) {
          return {error}
        }
      })
    /* sources.store
      .filter(data => data && data.design && data.design.parameters)
      .map(data => data.design.parameters) */
  ])
    .map(data => ({type: 'setDesignParams', data}))

  const timeOutDesignGeneration$ = most.never()
    /* designPath$
    sources.state$
    .delay(60000) */
    .map(data => ({type: 'timeOutDesignGeneration', data}))
    .tap(x => console.log('timeOutDesignGeneration'))

  // ui/toggles
  const toggleAutoReload$ = most.mergeArray([
    sources.dom.select('#autoReload').events('click')
      .map(e => e.target.checked),
    sources.store
      .filter(reply => reply.target === 'settings' && reply.type === 'read' && reply.data && reply.data.autoReload !== undefined)
      .map(reply => reply.data.autoReload)
  ])
  .map(data => ({type: 'toggleAutoReload', data}))

  const toggleInstantUpdate$ = most.mergeArray([
    sources.dom.select('#instantUpdate').events('click').map(event => event.target.checked),
    sources.store
      .filter(reply => reply.target === 'settings' && reply.type === 'read' && reply.data && reply.data.instantUpdate !== undefined)
      .map(reply => reply.data.instantUpdate)
  ])
    .map(data => ({type: 'toggleInstantUpdate', data}))

  const toggleVTreeMode$ = most.mergeArray([
    sources.dom.select('#toggleVtreeMode').events('click').map(event => event.target.checked),
    sources.store
      .filter(reply => reply.target === 'settings' && reply.type === 'read' && reply.data && reply.data.design && reply.data.design.vtreeMode !== undefined)
      .map(reply => reply.data.design.vtreeMode)
  ])
    .map(data => ({type: 'toggleVtreeMode', data}))

  // FIXME: this needs to be elsewhere
  const setZoomingBehaviour$ = ''
    //setDesignContent$.map(x=>{behaviours: {resetViewOn: [''], zoomToFitOn: ['new-entities']})
  // FIXME : same for this one, in IO ??
  const setAvailableExportFormats = setDesignSolids$


  return {
    setDesignPath$,
    setDesignContent$,
    updateDesignFromParams$,
    timeOutDesignGeneration$,
    setDesignParams$,
    setDesignSolids$,

    // ui
    toggleAutoReload$,
    toggleInstantUpdate$,
    toggleVTreeMode$
  }
}

module.exports = actions