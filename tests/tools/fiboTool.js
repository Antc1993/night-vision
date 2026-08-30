
// Fibonacci Retracement Tool Test

import data from '../../data/data-ohlcv-rsi.json?id=fiboTool'

export default function test(stack, chart) {

    stack.startTest('FiboRetracement test')

    stack.add('Set base dataset', () => {
        chart.data = data
        chart.fullReset()
        chart.se.uploadAndExec()
    })

    stack.add('Add FiboRetracement to dataset', () => {
        for (var p = 0; p < 1; p++) {
            chart.data.panes[p].overlays.push({
                name: 'FibonacciRetracementTool',
                type: 'FibonacciRetracementTool',
                data: [],
                dataExt: {
                    fibos: [
                        {
                            p1: [1663347600000, 4.56],
                            p2: [1663416000000, 4.7],
                            uuid: 'fibo-123'
                        }
                    ]
                },
                props: {},
                settings: {
                    zIndex: 1
                }
            })
        }
        chart.update()
    })

    stack.add('Verify rendering', () => {
        // This is a manual verification step in this framework
        console.log('FiboRetracement should be visible now')
    })

    stack.endTest()

}
