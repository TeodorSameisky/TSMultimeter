# Fluke 289/287 Remote Interface Specification

[FlukeView Forms Technical Support Home Page]

![Fluke Logo](images/100dd49a43f5c1c6717cb9f79a412223e6ba4b9d4101b990eb41b3532098b02b.jpg)

**Technical Note**

Fluke is providing this information to those few customers who would like this information. We give this information with the understanding that Fluke will not provide any additional support on this information. This means that our Product Support Service will not be able to answer any questions concerning this document.

## Introduction

This document describes some of the serial interface capabilities of Fluke model 289 and 287 Digital Multimeters.

## Communication Protocol (model 289 and 287)

The Fluke 289 and 287 have the same infrared (IR) serial interface as the model 189 and 187. While the IR hardware is somewhat different, the serial communications will operate with the same RS-232 mode at a higher baud rate:

**115200 Baud, no parity, 8 bits, 1 stop bit**

The IR adapter cable for the Fluke 289 and 287 does not need any special control of its signal lines. It can be used just like a traditional serial cable.

### HyperTerminal settings for communicating with Fluke 28X

- Disconnect (hang up phone icon)
- File Menu -> Properties
- Under Connect To Tab
  - Connect using: select com port that your cable is plugged into.
  - Configure button
    - Bits per second: 115200
    - Data bits: 8
    - Parity: None
    - Stop bits: 1
    - Flow control: None
- Under Settings Tab
  - Function, arrow, and ctrl keys act as: either one
  - Backspace key sends: doesn't really matter (remote interface does not do any command line editing)
  - Emulation: VT100
  - Terminal Setup... Your choice
- ASCII Setup button
  - ASCII Sending
    - check Send line ends with line feeds
    - check Echo typed characters locally
    - Line delay: 0
    - Character delay: 0
  - ASCII Receiving
    - check Append line feeds to incoming line ends
    - unchecked Force incoming data to 7 bit ASCII
    - check Wrap lines that exceed terminal width (actually your choice)
- Connect (left phone from cradle icon)

## Command Summary

Commands consist of 2 or more letter codes that are sent from a computer or other serial device to the meter. The commands can be sent as lower or upper case.

| Command | Description | Details |
|---------|-------------|---------|
| DS | Default Setup | Settings that are reset to default are: Hz trigger edge, Pulse Width and Duty Cycle polarity, Continuity beeper enable/disable, and Continuity beep on short/open. See remarks in Command Syntax. |
| ID | Identification | Returns model, serial number, and software version information. |
| RI | Reset Instrument | Reset all instrument settings to factory settings, except calibration constants. This is the same operation as Reset Meter under Setup front panel soft key. |
| RMP | Reset Meter Properties | Reset meter properties to their factory default state. This is the same operation as Reset Setup under Setup front panel soft key. |
| QM | Query Primary Measurement | Query primary measurement displayable value. |
| QDDA | Query Displayed Data | Query the present data that is displayed on the LCD display (not including the bargraph). The response to this query command is an ASCII response. |

See the section on Command Syntax for further detail regarding the command set.

### Command Acknowledge (CMD_ACK) response

The meter will acknowledge a command with a single digit, the CMD_ACK, followed by a carriage return (<CR>). Here is a list of the possible responses:

| CMD_ACK | Description |
|---------|-------------|
| '0' | OK, normal operation, no error. |
| '1' | Syntax error |
| '2' | Execution error |
| '5' | No data available |

**Note difference between 189 and 289:** In most cases, the 189 prefixed the command acknowledge response with the name of the originating command followed by a comma. The 289 does not do this. See Command Syntax below.

### Command Parameters

Unless otherwise stated, command response parameters are ASCII digits or letters.

## Command Syntax

### DS - Default Setup
- **Purpose:** Settings that are reset to default are: Hz trigger edge, Pulse Width and Duty Cycle polarity, Continuity beeper enable/disable, and Continuity beep on short/open.
- **Command Syntax:** `DS<CR>`
- **Response Syntax:** `CMD_ACK<CR>`
- **Remarks:** This shouldn't be confused with the Reset Instrument (RI) command. Note: This is not the same as pressing the ON/OFF button.

### ID - Identification
- **Purpose:** Returns model, serial number, and software version information.
- **Command Syntax:** `ID<CR>`
- **Response Syntax:** `CMD_ACK<CR>{identify string}<CR>`
- **Remarks:** {identify string} is in ASCII. Format: Model #, Software version, Serial #. The first 5 letters of the identity string will be "FLUKE" in uppercase letters.
- **Example:** `FLUKE 289,V1.00,95081087`

### RI - Reset Instrument
- **Purpose:** Resets all instrument settings to factory settings, except calibration constants. This is same operation as Reset Meter under Setup front panel soft key.
- **Command Syntax:** `RI<CR>`
- **Response Syntax:** `CMD_ACK<CR>`

### RMP - Reset Meter Properties
- **Purpose:** Reset meter properties to their factory default state. This is the same operation as Reset Setup under Setup front panel soft key.
- **Command Syntax:** `RMP<CR>`
- **Response Syntax:** `CMD_ACK<CR>`

### QM - Query Measurement
- **Purpose:** Query primary measurement displayable value. The value returned is the value shown in the primary display (assuming any pop up windows are not present). If the primary display is in the hold state, then the value returned is also the held value. If the primary display is showing a relative value, then the relative value is returned. The response to this query command is an ASCII response.
- **Command Syntax:** `QM<CR>`
- **Response Syntax:** `CMD_ACK<CR> READING_VALUE, UNIT, STATE, ATTRIBUTE <CR>`
- **Response Parameters:**
  - **READING_VALUE:** Floating point number in "base units of measure" (like volts, ohms, amps, farads, etc.)
  - **UNIT:** NONE, VDC, VAC, ADC, AAC, VAC_PLUS_DC, AAC_PLUS_DC, V (used in peak), A (used in peak), OHMS, S (for Siemens), Hz, S (for seconds), F (for Farads), CEL (for Celsius), FAR (for Fahrenheit), PCT (for Percent), dBm, dBV, dB, CREST_FACTOR
  - **STATE:** INVALID, NORMAL, BLANK, DISCHARGE (discharge error in capacitance), OL (overload), OL_MINUS (negative overload), OPEN_TC (open thermocouple)
  - **ATTRIBUTE:** NONE, OPEN_CIRCUIT, SHORT_CIRCUIT, GLITCH_CIRCUIT, GOOD_DIODE, LEO_OHMS, NEGATIVE_EDGE, POSITIVE_EDGE, HIGH_CURRENT (displayed value is flashing)
- **Remarks:** Overload and invalid will return value of 9.99999999e+37
- **Examples:**
  ```
  -0.023E-3,VDC,NORMAL,NONE
  0.255E-3,VAC,NORMAL,NONE
  9.323E0,VDC,NORMAL,NONE
  +9.99999999E+37,VDC,OL,NONE
  58.99E0,VAC,NORMAL,NONE
  63.679E0,Hz,NORMAL,POSITIVE_EDGE
  262.39E-3,VAC,NORMAL,NONE
  75.0E0,FAR,NORMAL,NONE
  23.9E0,CEL,NORMAL,NONE
  50.75E0,OHM,NORMAL,NONE
  50.762E0,OHM,NORMAL,NONE
  +9.99999999E+37,OHM,OL,NONE
  0.95E-6,F,NORMAL,NONE
  0.5498E0,VDC,NORMAL,GOOD_DIODE
  0.2785E0,VAC_PLUS_DC,NORMAL,NONE
  979.0E-6,ADC,NORMAL,NONE
  1.000E-3,ADC,NORMAL,NONE
  ```

### QDDA - Query Display Data

#### QDDA command response explanation

The QDDA command response is complex and has a logical data structure associated with it. Understanding this structure will make it easier to understand the QDDA command response and the syntax table below. The QDDA response is one long line of ASCII, but can logically be viewed as follows:

```
QDDA Command Response =
    primaryFunction,
    secondaryFunction,
    rangeData,
    lightningBolt,
    minMaxStartTime,
    numberOfModes,
    N repetitions of measurementMode, where N = numberOfModes
    numberOfReadings,
    N repetitions of readingData, where N = numberOfReadings
```

Each of the QDDA command response parameters are defined in the syntax table below. rangeData and readingData parameters from above are themselves logical data structures shown below. Parameters in the following logical data structures are also found in the syntax table below.

```
rangeData = autoRangeState, baseUnit, rangeNumber, unitMultiplier
```

```
readingData =
  readingID,
  readingValue,
  baseUnit,
  unitMultiplier,
  decimalPlaces,
  displayDigits,
  readingState,
  readingAttribute,
  timeStamp
```

- **Purpose:** Query the present data that is displayed on the LCD display (not including the bargraph). The response to this query command is an ASCII response.
- **Command Syntax:** `QDDA<CR>`
- **Response Syntax:** `CMD_ACK<CR> primaryFunction, secondaryFunction, rangeData, lightningBolt, minMaxStartTime, numberOfModes, N*measurementModes, numberOfReadings, M*readingData` Where N = numberOfModes and M = numberOfReadings and "*" means "repetition of".
- **Response Parameters:**
  - **primaryFunction:** LIMBO, V_AC, MV_AC, V_DC, MV_DC, V_AC_OVER_DC, V_DC_OVER_DC, V_AC_PLUS_DC, MV_AC_OVER_DC, MV_DC_OVER_DC, MV_AC_PLUS_DC, A_AC, MA_AC, UA_AC (for micro amps), A_DC, MA_DC, UA_DC (for micro amps), A_AC_OVER_DC, A_DC_OVER_DC, A_AC_PLUS_DC, MA_AC_OVER_DC, MA_DC_OVER_DC, MA_AC_PLUS_DC, UA_AC_OVER_DC, UA_DC_OVER_DC, UA_AC_PLUS_DC, TEMPERATURE, OHMS, CONDUCTANCE, CONTINUITY, CAPACITANCE, DIODE_TEST, V_AC_LOZ, OHMS_LOW
  - **secondaryFunction:** NONE, HERTZ, DUTY_CYCLE, PULSE_WIDTH, DBM, DBV, DBM_HERTZ, DBV_HERTZ, CREST_FACTOR, PEAK_MIN_MAX
  - **rangeData:** `autoRangeState, baseUnit, rangeNumber, unitMultiplier` - This information represents the range information at the end of the bargraph
  - **lightningBolt:** ON, OFF - This information represents the state of the lightning bolt.
  - **minMaxStartTime:** Double Float - Time is in units of seconds from midnight on the morning of January 1, 1970, not counting leap seconds. The whole (integer) portion of the float represents POSIX time or UNIX time. The fraction portion represents fractions of a second with a resolution around one millisecond). Value is 0.000 if MIN_MAX not enabled.
  - **numberOfModes:** Integer indicating the number measurementModes to follow. Notice that "0" is returned instead of "1,NONE". If numberOfModes is zero then measurementMode is not present.
  - **measurementMode:** AUTO_HOLD, HOLD, LOW_PASS_FILTER, MIN_MAX_AVG, RECORD, REL (for relative), REL_percent (for relative %)
  - **numberOfReadings:** Integer indicating the number readingData to follow. This number is ≥ 2.
  - **readingData:** `readingID, readingValue, baseUnit, unitMultiplier, decimalPlaces, displayDigits, readingState, readingAttribute, timestamp`

#### rangeData Parameters
These parameters represent information found at the end of the bargraph.
- **autoRangeState:** AUTO, MANUAL
- **baseUnit:** See UNIT parameter under QM command syntax.
- **rangeNumber:** Integer 1, 10, 100, 1000, 5, 50, 500, 5000, or 30
- **unitMultiplier:** Integer: -9 for n (nano – used in capacitance), -6 for u (micro), -3 for m (milli), 0 for no multiplier, 3 for k (kilo), 6 for M (Mega)

#### readingData Parameters
These parameters represent information associated with one of the readings that can appear on the LCD.
- **readingID:** Identifies which area of the LCD the readingData is associated with and is one of the following: LIVE (live reading that would appear in the mini reading at the top of the LCD in the center of the status bar), PRIMARY, SECONDARY, REL_LIVE (live relative reading that would appear in the mini reading at the top of the LCD in the center of the status bar), BARGRAPH, MINIMUM, MAXIMUM, AVERAGE, REL/reference, DB_REF (dB reference), TEMP_OFFSET
- **readingValue:** See READING_VALUE parameter under QM command syntax. Keep in mind, this value is in base units.
- **baseUnit:** See UNIT parameter under QM command syntax.
- **unitMultiplier:** See unitMultiplier under rangeData parameters in this table. This parameter indicates which unit multiplier is being used to display the readingValue (which is given in terms of base units).
- **decimalPlaces:** Precision. Number of digits to the right of the decimal point and displayed on meter.
- **displayDigits:** Significance. Number of displayed digits: 3, 4, or 5
- **readingState:** See STATE parameter under QM command syntax.
- **readingAttribute:** See ATTRIBUTE parameter under QM command syntax.
- **timeStamp:** Meter's time when reading was taken. Double Float - Time is in units of seconds from midnight on the morning of January 1, 1970, not counting leap seconds. The whole (integer) portion of the float represents POSIX time or UNIX time. The fraction portion represents fractions of a second with a resolution around one millisecond).

#### Examples
```
qdda
0
MV_AC,
NONE,
AUTO,VAC,50,-3,
OFF,
0.000,
0,
2,
LIVE,0.005029,VAC,-
3,3,5,NORMAL,NONE,1197308998.282,
PRIMARY,0.005029,VAC,-3,3,5,NORMAL,NONE,1197308998.282
qdda
0
MV_AC,
PEAK_MIN_MAX,
AUTO,VAC,50,-3,
OFF,
1197309132.612,
1,MIN_MAX AVG,
5,
LIVE,0.00515,VAC,-
3,2,5,NORMAL,NONE,1197309141.806,
PRIMARY,0.00
515,VAC,-3,2,5,NORMAL,NONE,1197309141.806,
MINIMUM,-0.0211,V,-
3,2,5,NORMAL,NONE,1197309133.616,
MAXIMUM,0.03055,V,-3,2,5,NORMAL,NONE,1197309133.366,
AVERAGE,0.00529,VAC,-3,2,5,NORMAL,NONE,1197309141.806
```

© 2007 Fluke Corporation. All rights reserved.