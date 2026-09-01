
import Utils from '../../src/stuff/utils.js'

const FILES = import.meta.glob(
    '../../data/indicators/*.json', { eager: true })

let IND = {}

for (var file in FILES) {
    let [fn, ext] = file.split('.json')
    IND[fn.split('/').pop().split('-')[0]] = FILES[file].default
}

export default function test(stack, chart) {

    stack.startTest('Indicators & Modal Catalog')

    stack.add('Open Indicator Catalog Modal', () => {
        chart.openIndicatorsModal()
        console.log('%c [TEST] Indicator Catalog Modal Opened! (chart.openIndicatorsModal())', 'color: #2962ff; font-weight: bold;')
    })

    stack.add('Add RSI Indicator via API', async () => {
        await chart.addIndicator('RSI')
        console.log('%c [TEST] RSI Indicator added to chart!', 'color: #10b981; font-weight: bold;')
    })

    stack.add('Add SMA Overlay via API', async () => {
        await chart.addIndicator('SMA', { length: 50 })
        console.log('%c [TEST] SMA 50 Overlay added to main pane!', 'color: #f59e0b; font-weight: bold;')
    })

    stack.add('Choose indicator from presets', () => {
        chart.data = IND['rsi']
        chart.fullReset()
        chart.se.uploadAndExec()

        console.log(
            '%c Call ind(<indicator-name>) \n or showcase() \n or chart.openIndicatorsModal()',
            'font-size: 1.25em; color: orange;')

        window.ind = (name) => {
            name = name.toLowerCase()
            if (!IND[name]) {
                console.warn('There is no indicator ' + name + '\n',
                `Indicator list: \n ${Object.keys(IND)}`)
                return
            }
            chart.data = IND[name]
            chart.fullReset()
            chart.se.uploadAndExec()
        }

        window.openIndicators = () => {
            chart.openIndicatorsModal()
        }

        window.addIndicator = (name, props = {}) => {
            return chart.addIndicator(name, props)
        }

        window.showcase = async (delay = 1000) => {
            for (var name in IND) {
                chart.data = IND[name]
                chart.fullReset()
                chart.se.uploadAndExec()
                await Utils.pause(delay)
            }
        }
    })
    stack.stop()
    stack.endTest()

}
