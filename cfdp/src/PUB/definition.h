/*
 * CF Addon Application
 */

/* Indicates application success status */
#define CF_SUCCESS							1
/* Indicates application failure status */
#define	CF_FAIL								0
/* Maximum allows length for storing paths */
#define CF_MAX_PATH_LEN						256
/* Maximum allowed length for storing configuration parameter values */
#define CF_MAX_CFG_VALUE_CHARS 				16
/* Maximum allowed size of incoming pdu */
#define CF_INCOMING_PDU_BUF_SIZE            512





/* CFDP */
#define CF_MAX_CFG_VALUE_CHARS 	16
#define CF_NUM_UPLINK_QUEUES		1
#define CF_QUEUES_PER_CHAN		3
#define CF_MAX_PLAYBACK_CHANNELS  2
#define CF_MAX_TRANSID_CHARS    	20 /* 255.255_9999999 */
#define CF_MAX_PARAM_LENGTH		256
#define CF_MAX_PARAM_ENUM_LENGTH	128
#define CF_MAX_ENUM_COUNT			64
#define CF_TELEM_PICK_LIST_COUNT	22

#define CF_EVENT_MESSAGE_LENGTH 		250
#define CF_NUM_ENG_CYCLES_PER_WAKEUP	10
#define CF_MAX_ERR_STRING_CHARS		32

//#define CF_SUCCESS              0
//#define CF_ERROR               -1
#define CF_BAD_MSG_LENGTH_RC   -2

#define CF_INVALID              0xFFFFFFFF

#define CF_DONT_CARE            0
#define CF_UNKNOWN              0
#define CF_TRANS_SUCCESS        1
#define CF_TRANS_FAIL           2

#define CF_ENTRY_UNUSED         0
#define CF_ENTRY_IN_USE         1

#define CF_DISABLED             0
#define CF_ENABLED              1

#define CF_FALSE                0
#define CF_TRUE                 1

#define CF_CLOSED               0
#define CF_OPEN                 1

#define CF_FILE_NOT_ACTIVE      0
#define CF_FILE_IS_ACTIVE       1

#define CF_NOT_IN_PROGRESS      0
#define CF_IN_PROGRESS          1

#define CF_UP_ACTIVEQ           0
#define CF_UP_HISTORYQ          1

#define CF_PB_PENDINGQ          0
#define CF_PB_ACTIVEQ           1
#define CF_PB_HISTORYQ          2

#define CF_PENDINGQ             0
#define CF_ACTIVEQ              1
#define CF_HISTORYQ             2

#define CF_ENTRY_UNUSED         0
#define CF_ENTRY_IN_USE         1

#define CF_NOT_ISSUED           0
#define CF_WAS_ISSUED           1

#define CF_DELETE_FILE          0
#define CF_KEEP_FILE            1

#define CF_PLAYBACKFILECMD      1
#define CF_PLAYBACKDIRCMD       2
#define CF_POLLDIRECTORY        3

#define CF_ALL                  0
#define CF_UPLINK               1
#define CF_PLAYBACK             2

#define CF_INCOMING             1
#define CF_OUTGOING             2

#define CF_TLM                  0
#define CF_CMD                  1

#define CF_CLASS_1              1
#define CF_CLASS_2              2

#define CF_QUEUES_PER_CHAN      3

#define CF_STAT_UNKNOWN         		0
#define CF_STAT_SUCCESS         		1
#define CF_STAT_CANCELLED       		2
#define CF_STAT_ABANDON         		3
#define CF_STAT_NO_META         		4
#define CF_STAT_PENDING         		5
#define CF_STAT_ALRDY_ACTIVE    		6
#define CF_STAT_PUT_REQ_ISSUED  		7
#define CF_STAT_PUT_REQ_FAIL    		8
#define CF_STAT_ACTIVE          		9

#define CF_FILE FILE

/* OS */
#define OS_PACK         __attribute__ ((packed))
#define OS_ALIGN(n)     __attribute__((aligned(n)))
#define OS_USED         __attribute__((used))
#define OS_PRINTF(n,m)  __attribute__ ((format (printf, n, m)))

#define OS_READ_ONLY        0
#define OS_WRITE_ONLY       1
#define OS_READ_WRITE       2

#define OS_SEEK_SET         0
#define OS_SEEK_CUR         1
#define OS_SEEK_END         2

#define OS_SUCCESS                     0
#define OS_ERROR                      -1
#define OS_INVALID_POINTER            -2

/* MISC */
#define DEFAULT_TEMP_BASE_DIR   		"/tmp/cf/"
#define DEFAULT_TEMP_FILE_NAME_PREFIX   "cftmp"

#define MAX_CFG_VALUE_CHARS 				16
#define QUEUES_PER_CHAN     				3
#define MAX_PLAYBACK_CHANNELS            	2
#define NUM_UPLINK_QUEUES    				2

/* CFE */
#define CFE_BIT(x)   (1 << (x))               /**< \brief Places a one at bit positions 0 - 31*/
#define CFE_SET(i,x) ((i) |= CFE_BIT(x))      /**< \brief Sets bit x of i */
#define CFE_CLR(i,x) ((i) &= ~CFE_BIT(x))     /**< \brief Clears bit x of i */
#define CFE_TST(i,x) (((i) & CFE_BIT(x)) != 0)/**< \brief TRUE(non zero) if bit x of i is set */

#define CFE_SB_CMD_HDR_SIZE 			8
#define CFE_SB_TLM_HDR_SIZE 			12
#define CFE_EVS_MAX_MESSAGE_LENGTH     	122


/* CF */

#define CF_MEMORY_POOL_BYTES                32768

#define CF_PDU_HDR_BYTES        			12
#define CF_PDUHDR_FIXED_FIELD_BYTES 		4
#define CF_FD_ZERO_REPLACEMENT 				0x7FFFFFFF
#define CF_RENAME_BUF    					1024

#define CF_NOOP_CC                      0
#define CF_RESET_CC                     1
#define CF_PLAYBACK_FILE_CC             2
#define CF_PLAYBACK_DIR_CC              3
#define CF_FREEZE_CC                    4
#define CF_THAW_CC                      5
#define CF_SUSPEND_CC                   6
#define CF_RESUME_CC                    7
#define CF_CANCEL_CC                    8
#define CF_ABANDON_CC                   9
#define CF_SET_MIB_PARAM_CC             10
#define CF_GET_MIB_PARAM_CC             11
#define CF_SEND_TRANS_DIAG_DATA_CC      12
#define CF_SET_POLL_PARAM_CC            13
#define CF_SEND_CFG_PARAMS_CC           14
#define CF_WRITE_QUEUE_INFO_CC          15
#define CF_ENABLE_DEQUEUE_CC            16
#define CF_DISABLE_DEQUEUE_CC           17
#define CF_ENABLE_DIR_POLLING_CC        18
#define CF_DISABLE_DIR_POLLING_CC       19
#define CF_DELETE_QUEUE_NODE_CC         20
#define CF_PURGE_QUEUE_CC               21
#define CF_WR_ACTIVE_TRANS_CC           22
#define CF_KICKSTART_CC                 23
#define CF_QUICKSTATUS_CC               24
#define CF_GIVETAKE_CC                  25
#define CF_ENADIS_AUTO_SUSPEND_CC       26
#define CF_CYCLES_PER_WAKEUP            27


/****************************
**  CF Command Formats     **
*****************************/
#define CF_MAX_CFG_VALUE_CHARS 				16
#define OS_MAX_PATH_LEN        				64
#define OS_MAX_API_NAME     				40
#define CF_MAX_PLAYBACK_CHANNELS            2
#define CF_MAX_TRANSID_CHARS    			20 /* 255.255_9999999 */
#define CF_MAX_CFG_PARAM_CHARS  			32




/* The following message classes are defined... */

/* If enabled, a message is output each time an Indication occurs */
#define CFDP_MSG_INDICATIONS 1

/* This message class provides information needed to debug problems within
 * the engine (related to memory use for storing 'Nak' PDUs).
 */
#define CFDP_MSG_DEBUG_MEMORY_USE 2

/* This message class provides information needed to debug problems within
 * the engine (related to maintenance of lists of missing data).
 */
#define CFDP_MSG_DEBUG_NAK 3

/* If enabled, the raw contents of incoming and outgoing PDUs are displayed. */
#define CFDP_MSG_DEBUG_PDU 4

/* If enabled, a message is output each time a Filedata PDU is received */
#define CFDP_MSG_PDU_FILEDATA 5

/* If enabled, a message is output each time a File Directive PDU is sent
 * or received.
 */
#define CFDP_MSG_PDU_NON_FILEDATA 6

/* If enabled, a message is output each time a Filedata PDU is retransmitted */
#define CFDP_MSG_PDU_RETRANSMITTED_FD 7

/* If enabled, a message is output every time a state machine runs
 * (lots of messages!).
 */
#define CFDP_MSG_STATE_ALL 8

/* If enabled, a message is output each time their is a state change within
 * a state machine.
 */
#define CFDP_MSG_STATE_CHANGE 9


/* WHAT IT DOES:  If the given 'param' string is valid, the return status
 *   is 1 and the specified parameter's current value is returned via the
 *   'value' argument.  Otherwise, the return status is 0.
 *   (the syntax of the character strings is described in 'cfdp_syntax.h')
 * NOTES:
 *   1) The given param string may be up to 'MAX_MIB_PARAMETER_LENGTH' chars.
 *   2) The returned string may be up to 'MAX_MIB_VALUE_LENGTH' chars long.
 */
#define MAX_MIB_PARAMETER_LENGTH 64
#define MAX_MIB_VALUE_LENGTH 64

/* WHAT IT DOES:  Returns the current MIB settings represented as a
 *   single character string (of unspecified format).
 * NOTE:  The returned char string may be up to 'MAX_MIB_AS_STRING_LENGTH'
 *   chars long.
 */
#define MAX_MIB_AS_STRING_LENGTH 10240

/* Each of these routines converts a structure to a string.  The string
 * may be up to 'max-as-string-length' chars long.
 */
#define MAX_AS_STRING_LENGTH 128

#define MAX_REQUEST_STRING_LENGTH 128

/*********************/
/*** User Requests ***/
/*********************/

/* This section applies to the routine 'cfdp_give_directive' */

/* Argument #1 of each request is one of these tokens.
 * (Uppercase/lowercase does not matter)
 */
#define PUT_REQUEST "PUT"
#define SUSPEND_REQUEST "SUSPEND"
#define RESUME_REQUEST "RESUME"
#define CANCEL_REQUEST "CANCEL"
#define ABANDON_REQUEST "ABANDON"
#define REPORT_REQUEST "REPORT"
#define FREEZE_REQUEST "FREEZE"
#define THAW_REQUEST "THAW"

/* Put Requests use this syntax:
 *     Put [-class1] <source_file> <destination_id> [dest_file]
 * Examples:
 *     Put myfile 23 yourfile  -- sends 'myfile' to CFDP node 23, and
 *                                calls it 'yourfile'.  (Service class 2)
 *     Put sun.data 23         -- sends 'sun.data' to CFDP node 23, and
 *                                calls it 'sun.data'.  (Service class 2)
 *     Put -class1 sun.data 23 -- same as previous, except Service Class 1
 *                                (i.e. no retransmissions by CFDP)
 *     Put sun.data 101.158    -- if the partner's Entity-ID exceeds 1 byte,
 *                                use dotted-decimal format.
 *     Put -class1 abc 23 def  -- Uses service class 1 to transfer 'abc'
 *                                to node 23 and call it 'def'.
 */

/* Suspend, Resume, Cancel, Abandon, and Report Requests all use the
 * same syntax.   (Only 'cancel' will be shown):
 *     Cancel <transaction>
 * Examples:
 *     Cancel 23_808    -- cancels the transaction which CFDP node 23 started
 *                         and assigned transaction-sequence-number = 808.
 *                         (a transaction is uniquely identified by the
 *                         combination of the Source-ID and trans-seq-number)
 *     Cancel 101.158_3 -- ID=101.158, trans-seq-number=3.
 *     Cancel all       -- cancels all transactions.
 */

/* The Freeze and Thaw Requests take no arguments:
 *     Freeze
 *     Thaw
 */



/***********/
/*** MIB ***/
/***********/

/* This section applies to the routines 'cfdp_get_mib_parameter' and
 * 'cfdp_set_mib_parameter'.
 */

/* Char string representations of MIB Local parameters (case-insensitive) */
#define MIB_MY_ID "MY_ID"
#define MIB_ISSUE_EOF_RECV "ISSUE_EOF_RECV"
#define MIB_ISSUE_EOF_SENT "ISSUE_EOF_SENT"
#define MIB_ISSUE_FILE_SEGMENT_RECV "ISSUE_FILE_SEGMENT_RECV"
#define MIB_ISSUE_FILE_SEGMENT_SENT "ISSUE_FILE_SEGMENT_SENT"
#define MIB_ISSUE_RESUMED "ISSUE_RESUMED"
#define MIB_ISSUE_SUSPENDED "ISSUE_SUSPENDED"
#define MIB_ISSUE_TRANSACTION_FINISHED "ISSUE_TRANSACTION_FINISHED"
#define MIB_RESPONSE_TO_FAULT "RESPONSE_TO_FAULT"

/* Char string representations of MIB Remote parameters (case-insensitive) */
#define MIB_ACK_LIMIT "ACK_LIMIT"
#define MIB_ACK_TIMEOUT "ACK_TIMEOUT"
#define MIB_INACTIVITY_TIMEOUT "INACTIVITY_TIMEOUT"
#define MIB_NAK_LIMIT "NAK_LIMIT"
#define MIB_NAK_TIMEOUT "NAK_TIMEOUT"
#define MIB_SAVE_INCOMPLETE_FILES "SAVE_INCOMPLETE_FILES"

/* Char string representation of File Chunk size parameter */
#define MIB_OUTGOING_FILE_CHUNK_SIZE "OUTGOING_FILE_CHUNK_SIZE"

/* Char string representations of MIB parameter values
 *   boolean - "YES" or "NO"
 *   entity-ID - a dotted-decimal string; e.g. "10", "11", "101.34".
 *   numbers - read/written via calls to sscanf/sprintf using "%lu" format.
 */

/* Examples:
 *   cfdp_set_mib_parameter (MIB_MY_ID, "10");
 *   cfdp_set_mib_parameter (MIB_ACK_TIMEOUT, "15");    // 15 seconds
 *   cfdp_set_mib_parameter (MIB_ISSUE_EOF_SENT, "YES");
 */
