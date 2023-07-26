from bleak import BleakGATTCharacteristic

@staticmethod
def transfer_measure(measure_number):
    if not isinstance(measure_number, int):
        raise TypeError('The parameter must be an integer.')
    if not 0 <= measure_number <= 12:
        raise ValueError('The number must be between zero and twelve.')

    measure = {
        0: 'Vdc',
        1: 'Vac',
        2: 'Adc',
        3: 'Aac',
        4: 'Ohms',
        5: 'F',
        6: 'Hz',
        7: '%%',
        8: '°C',
        9: '°F',
        10: 'V',
        11: 'Ohms',
        12: 'hFE'
    }

    return measure.get(measure_number, 'Invalid Input for measure.')

@staticmethod
def transfer_scale(scale_number):
    if not isinstance(scale_number, int):
        raise TypeError('The parameter must be an integer.')

    scale = {
        1: 'n',
        2: 'u',
        3: 'm',
        5: 'k',
        6: 'M'
    }

    return scale.get(scale_number, ' ')

@staticmethod
def transfer_function(function_number):
    if not isinstance(function_number, int):
        raise TypeError('The parameter must be an integer.')

    function = {
        1: 'Hold',
        2: 'Δ',
        4: 'Auto',
        8: 'Low Battery',
        16: 'min',
        32: 'max'
    }

    return function.get(function_number, ' ')

def input_data_1(hex_data):
    bin_data = format(hex_data, '#018b')[2:]

    measure_number = int(str(bin_data[6]) +
                            str(bin_data[7]) +
                            str(bin_data[8]) +
                            str(bin_data[9]), 2)

    scale_number = int(str(bin_data[10]) +
                        str(bin_data[11]) +
                        str(bin_data[12]), 2)

    decimal = int(str(bin_data[13]) +
                    str(bin_data[14]) +
                    str(bin_data[15]), 2)

    scale = transfer_scale(scale_number)
    measure = transfer_measure(measure_number)

    return scale, measure, decimal

def input_data_2(hex_data):
    bin_data =  format(hex_data, '#018b')[2:]
    function_number = int(str(bin_data), 2)

    function = transfer_function(function_number)

    return function

def input_data_3(hex_data, decimal):
    bin_data =  format(hex_data, '#018b')[2:]
    value = int(str(bin_data), 2)

    if value > 32767:
        value = -1 * (value & 32767)

    value = value / 10 ** decimal

    return str(value)

def decode(sender: BleakGATTCharacteristic, data: bytearray):
    scale, measure, decimal = input_data_1(data[0] + data[1]*256)
    function = input_data_2(data[2] + data[3]*256)
    value = input_data_3(data[4] + data[5]*256, decimal)
    return [function,value,scale,measure]
