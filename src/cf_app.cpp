#include <nan.h>
#include <fstream>
#include <iostream>
#include <string>
#include <typeinfo>
#include <stdarg.h>
#include <node.h>
#include <v8.h>
#include "cf_app.h"


typedef struct
{
	Nan::Persistent<v8::Function> function;

}CF_PrintCallbackData;

CF_PrintCallbackData PrintInfo;

CF_PrintCallbackData PrintDebug;

CF_PrintCallbackData PrintError;

CF_PrintCallbackData PrintWarning;


int CF_TableInit (){
	return SUCCESS;
}

int CF_ChannelInit(){
	return SUCCESS;
}



boolean CF_PduOutputOpen (ID SourceId, ID DestinationId)
{
   return (YES);
}

int32_t CF_Tmpopen(const char *path,  int32_t access,  uint32_t mode)
{

    int32_t fd;

    fd = open(path,access,mode);

    if(fd == 0)
    {
    	fd = CF_FD_ZERO_REPLACEMENT;
    }

    return fd;

}

int32_t CF_Tmpcreat(const char *path, int32_t  access)
{

    int32_t fd;

    fd = creat(path,access);
    if(fd == 0)
    {
    	fd = CF_FD_ZERO_REPLACEMENT;
    }

    return fd;

}

int32_t CF_Tmpclose(int32_t  filedes)
{
    if(filedes == CF_FD_ZERO_REPLACEMENT)
    {
    	filedes = 0;
    }

    return (close(filedes));
}

int32_t  CF_Tmpread(int32_t  filedes, void *buffer, uint32_t nbytes)
{

    if(filedes == CF_FD_ZERO_REPLACEMENT)
    {
    	filedes = 0;
    }
    return (read(filedes,buffer,nbytes));

}

int32_t CF_Tmpwrite(int32_t  filedes, void *buffer, uint32_t nbytes)
{
    if(filedes == CF_FD_ZERO_REPLACEMENT)
    {
    	filedes = 0;
    }
    return(write(filedes,buffer,nbytes));
}

int32_t  CF_Tmplseek(int32_t  filedes, int32_t offset, uint32_t whence)
{

    if(filedes == CF_FD_ZERO_REPLACEMENT)
    {
    	filedes = 0;
    }
    return (fseek((uint32_t)filedes,offset,whence));
}

CFDP_FILE * CF_Fopen(const char *Name, const char *Mode){

	FILE	*fileHandle;
	char temp[CFDP_MAX_PATH_LEN];

	strncpy(temp, BaseDir, CFDP_MAX_PATH_LEN);
	strncat(temp, Name, CFDP_MAX_PATH_LEN);
    fileHandle = fopen(temp, Mode);
    return fileHandle;
}

size_t CF_Fread(void *Buffer, size_t Size,size_t Count, CFDP_FILE *File)
{
	size_t out_size = fread(Buffer, Size, Count, File);
	return out_size;
}

size_t CF_Fwrite(const void *Buffer, size_t Size,size_t Count, CFDP_FILE *File)
{
	size_t out_size = fwrite(Buffer, Size, Count, File);
	return out_size;
}

int CF_Fclose(CFDP_FILE *File)
{
	return fclose(File);
}

int CF_Fseek(CFDP_FILE *File, long int Offset, int Whence)
{
    int     	ReturnVal;
    uint16_t  	WhenceVal;
    int32_t   	SeekVal;

    WhenceVal = 0;
    ReturnVal = OS_SUCCESS;

    if(Whence == SEEK_SET)
    {
        WhenceVal = OS_SEEK_SET;
    }else if(Whence == SEEK_CUR)
    {
        WhenceVal = OS_SEEK_CUR;
    }else if(Whence == SEEK_END)
    {
        WhenceVal = OS_SEEK_END;
    }

    SeekVal = CF_Tmplseek((int32_t)File,(int32_t)Offset,WhenceVal);

    if(SeekVal == OS_ERROR)
    {
        ReturnVal = 1;
    }
    else
    {
        ReturnVal = OS_SUCCESS;
    }

    return(ReturnVal);
}

int CF_RemoveFile(const char *Name)
{
	char temp[CFDP_MAX_PATH_LEN];

	strncpy(temp, BaseDir, CFDP_MAX_PATH_LEN);
	strncat(temp, Name, CFDP_MAX_PATH_LEN);
	return remove(temp);
}

int CF_RenameFile(const char *TempFileName, const char *NewName)
{
	char tempOld[CFDP_MAX_PATH_LEN];
	char tempNew[CFDP_MAX_PATH_LEN];

	strncpy(tempOld, BaseDir, CFDP_MAX_PATH_LEN);
	strncat(tempOld, TempFileName, CFDP_MAX_PATH_LEN);

//	strncpy(tempNew, BaseDir, CFDP_MAX_PATH_LEN);
	strncat(tempNew, NewName, CFDP_MAX_PATH_LEN);

	return rename(tempOld, tempNew);
}

u_int_4 CF_FileSize(const char *Name)
{
	struct stat st;
	char temp[CFDP_MAX_PATH_LEN];

	strncpy(temp, BaseDir, CFDP_MAX_PATH_LEN);
	strncat(temp, Name, CFDP_MAX_PATH_LEN);
	stat(temp, &st);
	return st.st_size;
}


void CF_Indication (INDICATION_TYPE IndType, TRANS_STATUS TransInfo)
{
		CF_QueueEntry 	*queueEntryPtr = NULL;
	    uint32_t	chan;
	    char        localFinalStatBuf[CFDP_MAX_ERR_STRING_CHARS];
	    char        localCondCodeBuf[CFDP_MAX_ERR_STRING_CHARS];
	    char        entityIDBuf[CFDP_MAX_CFG_VALUE_CHARS];

	    /*initialization*/
	    TransInfo.md.source_file_name[MAX_FILE_NAME_LENGTH - 1] = '\0';
	    TransInfo.md.dest_file_name[MAX_FILE_NAME_LENGTH - 1] = '\0';

	    switch(IndType)
	    {
	        case IND_TRANSACTION:
	            break;

	        case IND_MACHINE_ALLOCATED:
	            /* if uplink trans, build new node */
	            if((TransInfo.role ==  CLASS_1_RECEIVER) ||
	               (TransInfo.role ==  CLASS_2_RECEIVER))
	            {
	                /* Build up a new Node */
	            	CF_QueueEntry 	*queueEntry = new CF_QueueEntry;
	                queueEntryPtr = queueEntry;

	                if(queueEntryPtr != NULL)
	                {
	                    /* fill-in queue entry */
	                    if(TransInfo.role ==  CLASS_1_RECEIVER)
	                        queueEntryPtr->Class = 1;
	                    else
	                        queueEntryPtr->Class = 2;

	                    queueEntryPtr->Status   = CFDP_STAT_ACTIVE;
	                    queueEntryPtr->CondCode = 0;
	                    queueEntryPtr->Priority = 0xFF;
	                    /* TODO:  Fix this.  Replace it with something more dynamic. */
	                    queueEntryPtr->ChanNum  = 0;
	                    queueEntryPtr->Source   = 0xFF;
	                    queueEntryPtr->Warning  = CFDP_NOT_ISSUED;
	                    queueEntryPtr->NodeType = CFDP_UPLINK;
	                    queueEntryPtr->TransNum = TransInfo.trans.number;
	                    sprintf(&queueEntryPtr->SrcEntityId[0],"%d.%d",
	                            TransInfo.trans.source_id.value[0],
	                            TransInfo.trans.source_id.value[1]);

	                    /* filenames not known until the metadata rcvd indication */
	                    strcpy(&queueEntryPtr->SrcFile[0],"UNKNOWN");
	                    strcpy(&queueEntryPtr->DstFile[0],"UNKNOWN");

	                    /* Place Node on Uplink Active Queue */
//	                    AddFileToUpQueue(CFDP_UP_ACTIVEQ, queueEntryPtr);
	                    printf("CFDP::AddFileToUpQueue\n");
	                }
	                else
	                {
	                	printf( "AllocQueueEntry returned NULL.");
	                }
	            }
	            else
	            {
	                /* file-send transaction */
//	                queueEntryPtr = FindNodeAtFrontOfQueue(TransInfo);
	            	queueEntryPtr = 0;
	            	printf("CFDP::FindNodeAtFrontOfQueue\n");

	                if(queueEntryPtr != NULL)
	                {
	                	printf( "Outgoing trans started %d.%d_%d,src %s",
	                                    TransInfo.trans.source_id.value[0],
	                                    TransInfo.trans.source_id.value[1],
	                                    TransInfo.trans.number,
	                                    &TransInfo.md.source_file_name[0]);

	                    queueEntryPtr->TransNum = TransInfo.trans.number;

	                    Chan[queueEntryPtr->ChanNum].DataBlast = CFDP_IN_PROGRESS;
	                    Chan[queueEntryPtr->ChanNum].TransNumBlasting = TransInfo.trans.number;

	                    /* move node from pending queue to active queue */
//	                    RemoveFileFromPbQueue(queueEntryPtr->ChanNum,
//	                                                CFDP_PB_PENDINGQ,
//	                                                queueEntryPtr);
//	                    AddFileToPbQueue(queueEntryPtr->ChanNum, CFDP_PB_ACTIVEQ,
//	                                                queueEntryPtr);

	                    queueEntryPtr->Status = CFDP_STAT_ACTIVE;

	                }


	            }/* end if */

	            break;

	        case IND_METADATA_SENT:
	            break;

	        case IND_METADATA_RECV:
//	            Up.MetaCount++;

	            sprintf(entityIDBuf,"%d.%d",TransInfo.trans.source_id.value[0],
	                                        TransInfo.trans.source_id.value[1]);

	            /* file-receive transaction */
            	printf( "Incoming trans started %d.%d_%d,dest %s",
	                                TransInfo.trans.source_id.value[0],
	                                TransInfo.trans.source_id.value[1],
	                                TransInfo.trans.number,
	                                TransInfo.md.dest_file_name);

	            /*  find corresponding queue entry (created in mach allocated  */
	            /*  indication) then fill in src and dest filenames */

	            queueEntryPtr = FindUpNodeByTransID(CFDP_UP_ACTIVEQ, entityIDBuf, TransInfo.trans.number);

	            if(queueEntryPtr != NULL)
	            {
	                strncpy(&queueEntryPtr->SrcFile[0],TransInfo.md.source_file_name, CFDP_MAX_PATH_LEN);
	                strncpy(&queueEntryPtr->DstFile[0],TransInfo.md.dest_file_name, CFDP_MAX_PATH_LEN);
	            }

	            break;

	        case IND_EOF_SENT:
	            /* Find Channel Number, search the given queue for all channels */
//	            chan = GetChanNumFromTransId(CFDP_PB_ACTIVEQ, TransInfo.trans.number);
	            if(chan != CFDP_ERROR)
	            {
	            	/* Start transfer of next file on queue (if queue has another file) */
//	                StartNextFile(chan);
	            }

	            break;

	        case IND_EOF_RECV:
	            break;

	        case IND_TRANSACTION_FINISHED:
	            break;

	        case IND_MACHINE_DEALLOCATED:
	            /* do transaction-success processing */
	            if(TransInfo.final_status == FINAL_STATUS_SUCCESSFUL)
	            {
	                /* successful file-receive transaction processing */
	                if( (TransInfo.role ==  CLASS_1_RECEIVER) ||
	                    (TransInfo.role ==  CLASS_2_RECEIVER) )
	                {
	                    sprintf(entityIDBuf,"%d.%d",TransInfo.trans.source_id.value[0],
	                                        TransInfo.trans.source_id.value[1]);

	                    queueEntryPtr = FindUpNodeByTransID(CFDP_UP_ACTIVEQ, entityIDBuf, TransInfo.trans.number);
	                    if(queueEntryPtr != NULL)
	                    {
	                        queueEntryPtr->Status = CFDP_STAT_SUCCESS;
	                    }

//	                    Up.SuccessCounter++;
//	                    strncpy(&Up.LastFileUplinked[0], &TransInfo.md.dest_file_name[0], CFDP_MAX_PATH_LEN);

//	                    MoveUpNodeActiveToHistory(entityIDBuf, TransInfo.trans.number);

	                	printf( "Incoming trans success %d.%d_%d,dest %s",
	                                TransInfo.trans.source_id.value[0],
	                                TransInfo.trans.source_id.value[1],
	                                TransInfo.trans.number,
	                                &TransInfo.md.dest_file_name[0]);
	                }
	                else
	                {
	                    /* successful file-send transaction processing */
//	                    chan = GetChanNumFromTransId(CFDP_PB_ACTIVEQ, TransInfo.trans.number);

	                    if(chan != CFDP_ERROR)
	                    {
	                        //Chan[chan].SuccessCounter++;
//	                        queueEntryPtr = FindPbNodeByTransNum(chan, CFDP_PB_ACTIVEQ, TransInfo.trans.number);
	                        queueEntryPtr = 0;
	                    	if(queueEntryPtr != NULL)
	                        {
	                            queueEntryPtr->Status = CFDP_STAT_SUCCESS;
	                        }
	                    }

	                    //if(queueEntryPtr->Preserve == CFDP_DELETE_FILE)
	                    //{
	                    //    OS_remove(&TransInfo.md.source_file_name[0]);
	                    //}

//	                    MoveDwnNodeActiveToHistory(TransInfo.trans.number);

	                	printf( "Outgoing trans success %d.%d_%d,src %s",
	                                    TransInfo.trans.source_id.value[0],
	                                    TransInfo.trans.source_id.value[1],
	                                    TransInfo.trans.number,
	                                    &TransInfo.md.source_file_name[0]);
	                }
	            }
	            else
	            {
	                /* do transaction-failed processing */
//	                sprintf(&App.LastFailedTrans[0],"%d.%d_%lu",
//	                        TransInfo.trans.source_id.value[0],
//	                        TransInfo.trans.source_id.value[1],
//	                        TransInfo.trans.number);

	                /* increment the corresponding telemetry counter */
//	                IncrFaultCtr(&TransInfo);

	                /* for error event below */
//	                GetFinalStatString(localFinalStatBuf,
//	                                      TransInfo.final_status,
//	                                      CFDP_MAX_ERR_STRING_CHARS);

	                /* for error event below */
//	                GetCondCodeString(localCondCodeBuf,
//	                                     TransInfo.condition_code,
//	                                     CFDP_MAX_ERR_STRING_CHARS);


	                /* failed file-receive transaction processing */
	                if( (TransInfo.role ==  CLASS_1_RECEIVER) ||
	                    (TransInfo.role ==  CLASS_2_RECEIVER) )
	                {
//	                    Up.FailedCounter++;

	                    sprintf(entityIDBuf,"%d.%d",TransInfo.trans.source_id.value[0],
	                                        TransInfo.trans.source_id.value[1]);

	                    queueEntryPtr = FindUpNodeByTransID(CFDP_UP_ACTIVEQ, entityIDBuf, TransInfo.trans.number);

	                    if(queueEntryPtr != NULL)
	                    {
	                        queueEntryPtr->Status = TransInfo.final_status;
	                        queueEntryPtr->CondCode = TransInfo.condition_code;
	                    }

//	                    MoveUpNodeActiveToHistory(entityIDBuf, TransInfo.trans.number);

	                	printf( "Incoming trans %d.%d_%d %s,CondCode %s,dest %s",
	                                TransInfo.trans.source_id.value[0],
	                                TransInfo.trans.source_id.value[1],
	                                TransInfo.trans.number,
	                                localFinalStatBuf,
	                                localCondCodeBuf,
	                                TransInfo.md.dest_file_name);

	                }
	                else
	                {
	                    /* failed file-send transaction processing */
//	                    chan = GetChanNumFromTransId(CFDP_PB_ACTIVEQ, TransInfo.trans.number);''

	                    //Chan[chan].FailedCounter++;
//	                    queueEntryPtr = FindPbNodeByTransNum(chan, CFDP_PB_ACTIVEQ, TransInfo.trans.number);
	                    queueEntryPtr = 0;
	                    if(queueEntryPtr != NULL)
	                    {
	                        queueEntryPtr->Status = TransInfo.final_status;
	                        queueEntryPtr->CondCode = TransInfo.condition_code;
	                    }

//	                    MoveDwnNodeActiveToHistory(TransInfo.trans.number);

	                	printf( "Outgoing trans %d.%d_%d %s,CondCode %s,Src %s,Ch %d ",
	                                TransInfo.trans.source_id.value[0],
	                                TransInfo.trans.source_id.value[1],
	                                TransInfo.trans.number,
	                                localFinalStatBuf,
	                                localCondCodeBuf,
	                                TransInfo.md.source_file_name,
	                                chan);

	                    /* if trans was aborted before EOF was sent, need to  */
	                    /* start the next file. This could happen via flight-side */
	                    /* abandon or gnd-side cancel */
	                    if(TransInfo.trans.number == Chan[chan].TransNumBlasting)
	                    {
	                    	Chan[chan].DataBlast = CFDP_NOT_IN_PROGRESS;
	                    	Chan[chan].TransNumBlasting = 0;

	                    //    if(CF_AppData.Tbl->OuCh[Chan].DequeueEnable == CF_ENABLED){
	                    //        CF_StartNextFile(Chan);
	                    //    }/* end if */

	                    }/* end if */
	                } /* end if */

	            }/* end if */

	            break;

	        case IND_ACK_TIMER_EXPIRED:
            	printf( "Ack Timer Expired %d.%d_%d,%s",
	                              TransInfo.trans.source_id.value[0],
	                              TransInfo.trans.source_id.value[1],
	                              TransInfo.trans.number,
	                              &TransInfo.md.source_file_name[0]);
	            break;

	        case IND_INACTIVITY_TIMER_EXPIRED:
            	printf( "Inactivity Timer Expired %d.%d_%d,%s",
	                              TransInfo.trans.source_id.value[0],
	                              TransInfo.trans.source_id.value[1],
	                              TransInfo.trans.number,
	                              &TransInfo.md.source_file_name[0]);
	            break;

	        case IND_NAK_TIMER_EXPIRED:
            	printf( "Nack Timer Expired %d.%d_%d,%s",
	                              TransInfo.trans.source_id.value[0],
	                              TransInfo.trans.source_id.value[1],
	                              TransInfo.trans.number,
	                              &TransInfo.md.source_file_name[0]);
	            break;

	        case IND_SUSPENDED:
            	printf( "Transaction Suspended %d.%d_%d,%s",
	                              TransInfo.trans.source_id.value[0],
	                              TransInfo.trans.source_id.value[1],
	                              TransInfo.trans.number,
	                              &TransInfo.md.source_file_name[0]);
	            break;

	        case IND_RESUMED:
            	printf( "Transaction Resumed %d.%d_%d,%s",
	                              TransInfo.trans.source_id.value[0],
	                              TransInfo.trans.source_id.value[1],
	                              TransInfo.trans.number,
	                              &TransInfo.md.source_file_name[0]);
	            break;

	        case IND_REPORT:
	            break;

	        case IND_FAULT:
            	printf( "Fault %d,%d.%d_%d,%s",
	                              TransInfo.condition_code,
	                              TransInfo.trans.source_id.value[0],
	                              TransInfo.trans.source_id.value[1],
	                              TransInfo.trans.number,
	                              &TransInfo.md.source_file_name[0]);
	            break;

	        case IND_ABANDONED:
            	printf( "Indication:Transaction Abandon %d.%d_%d,%s",
	                              TransInfo.trans.source_id.value[0],
	                              TransInfo.trans.source_id.value[1],
	                              TransInfo.trans.number,
	                              &TransInfo.md.source_file_name[0]);

//	            TotalAbandonTrans++;
	            break;

	        default:
            	printf( "Unexpected indication type %d.", IndType);
	            break;

	    }/* end switch */
	};


CF_QueueEntry* FindUpNodeByTransID(uint32_t queue, char *srcEntityID, uint32_t trans)
{
	CF_QueueEntry *qNodePtr;

    qNodePtr = AppData.UpQ[queue].HeadPtr;
    while(qNodePtr != NULL)
    {
        if(qNodePtr->TransNum == trans)
        {
            if(strncmp(srcEntityID, qNodePtr->SrcEntityId, CFDP_MAX_CFG_VALUE_CHARS) == 0)
                return qNodePtr;
        }
        qNodePtr = qNodePtr->Next;
    }

    return NULL;
}

boolean CF_PduOutputReady (PDU_TYPE PduType, TRANSACTION TransInfo,ID DestinationId){
	printf("CF_PduOutputReady\n");
	return (YES);

}

void CF_PduOutputSend (TRANSACTION TransInfo,ID DestinationId, CFDP_DATA *PduPtr){
	printf("CF_IPduOutputsend\n");

}

using namespace v8;

typedef struct
{
	boolean IsDefined = false;
	Persistent <Function> Function;
}CallbackData;

CallbackData LogInfo;
CallbackData LogError;
CallbackData LogDebug;
CallbackData LogWarning;

void Util_SetCallbackData(CallbackData * , Isolate * , v8::Local<v8::Value> );



int CF_InfoEvent(const char *Format, ...)
{
    va_list         ArgPtr;
    char 			BigBuf[CFE_EVS_MAX_MESSAGE_LENGTH];
    uint32_t        Status,i;
    Status = 0;
    va_start (ArgPtr, Format);
    vsnprintf(BigBuf,CFE_EVS_MAX_MESSAGE_LENGTH,Format,ArgPtr);
    va_end (ArgPtr);

    for (i=0;i<CFE_EVS_MAX_MESSAGE_LENGTH;i++){
      if(BigBuf[i] == '\n'){
    	  BigBuf[i] = '\0';
          break;
      }
    }

    Isolate *isolate = Isolate::GetCurrent();

	const int argc = 1;
	v8::Local<v8::Value> argv[argc];

	std::string str(BigBuf);
	argv[0] = Nan::New(BigBuf).ToLocalChecked();

	Local<Function> Func = Local<Function>::New(isolate, LogInfo.Function);

	if(LogInfo.IsDefined)
	{
		Func->Call(isolate->GetCurrentContext()->Global(), argc, argv);
		Status = 1;
	}



    return(Status);
}

int CF_ErrorEvent(const char *Format, ...)
{
    va_list         ArgPtr;
    char 			BigBuf[CFE_EVS_MAX_MESSAGE_LENGTH];
    uint32_t        Status,i;
    Status = 0;
    va_start (ArgPtr, Format);
    vsnprintf(BigBuf,CFE_EVS_MAX_MESSAGE_LENGTH,Format,ArgPtr);
    va_end (ArgPtr);

    for (i=0;i<CFE_EVS_MAX_MESSAGE_LENGTH;i++){
      if(BigBuf[i] == '\n'){
    	  BigBuf[i] = '\0';
          break;
      }
    }

    Isolate *isolate = Isolate::GetCurrent();

	const int argc = 1;
	v8::Local<v8::Value> argv[argc];

	std::string str(BigBuf);
	argv[0] = Nan::New(BigBuf).ToLocalChecked();

	Local<Function> Func = Local<Function>::New(isolate, LogError.Function);

	if(LogError.IsDefined)
	{
		Func->Call(isolate->GetCurrentContext()->Global(), argc, argv);
		Status = 1;

	}

    return(Status);
}

int CF_DebugEvent(const char *Format, ...)
{
    va_list         ArgPtr;
    char 			BigBuf[CFE_EVS_MAX_MESSAGE_LENGTH];
    uint32_t        Status,i;
    Status = 0;
    va_start (ArgPtr, Format);
    vsnprintf(BigBuf,CFE_EVS_MAX_MESSAGE_LENGTH,Format,ArgPtr);
    va_end (ArgPtr);

    for (i=0;i<CFE_EVS_MAX_MESSAGE_LENGTH;i++){
      if(BigBuf[i] == '\n'){
    	  BigBuf[i] = '\0';
          break;
      }
    }

    Isolate *isolate = Isolate::GetCurrent();

	const int argc = 1;
	v8::Local<v8::Value> argv[argc];

	std::string str(BigBuf);
	argv[0] = Nan::New(BigBuf).ToLocalChecked();

	Local<Function> Func = Local<Function>::New(isolate, LogDebug.Function);

	if(LogDebug.IsDefined)
	{
		Func->Call(isolate->GetCurrentContext()->Global(), argc, argv);
		Status = 1;
	}

    return(Status);
}

int CF_WarningEvent(const char *Format, ...)
{
    va_list         ArgPtr;
    char 			BigBuf[CFE_EVS_MAX_MESSAGE_LENGTH];
    uint32_t        Status,i;
    Status = 0;
    va_start (ArgPtr, Format);
    vsnprintf(BigBuf,CFE_EVS_MAX_MESSAGE_LENGTH,Format,ArgPtr);
    va_end (ArgPtr);

    for (i=0;i<CFE_EVS_MAX_MESSAGE_LENGTH;i++){
      if(BigBuf[i] == '\n'){
    	  BigBuf[i] = '\0';
          break;
      }
    }

    Isolate *isolate = Isolate::GetCurrent();

	const int argc = 1;
	v8::Local<v8::Value> argv[argc];

	std::string str(BigBuf);
	argv[0] = Nan::New(BigBuf).ToLocalChecked();

	Local<Function> Func = Local<Function>::New(isolate, LogWarning.Function);


	if(LogWarning.IsDefined)
	{
		Func->Call(isolate->GetCurrentContext()->Global(), argc, argv);
		Status = 1;

	}

    return(Status);
}

int CF_RegisterCallbacks(){

    register_indication (CF_Indication);
    register_pdu_output_open (CF_PduOutputOpen);
    register_pdu_output_ready (CF_PduOutputReady);
    register_pdu_output_send (CF_PduOutputSend);
    register_printf_debug(CF_DebugEvent);
    register_printf_info(CF_InfoEvent);
    register_printf_warning(CF_WarningEvent);
    register_printf_error(CF_ErrorEvent);
    register_file_size(CF_FileSize);
    register_rename(CF_RenameFile);
    register_remove(CF_RemoveFile);
    register_fseek(CF_Fseek);
    register_fopen(CF_Fopen);
    register_fread(CF_Fread);
    register_fwrite(CF_Fwrite);
    register_fclose(CF_Fclose);

}

int CF_SetMibParams(){

    cfdp_set_mib_parameter ("ACK_TIMEOUT", "10");
    cfdp_set_mib_parameter ("ACK_LIMIT", "2");
    cfdp_set_mib_parameter ("NAK_TIMEOUT", "5");
    cfdp_set_mib_parameter ("NAK_LIMIT", "3");
    cfdp_set_mib_parameter ("INACTIVITY_TIMEOUT", "20");
    cfdp_set_mib_parameter ("OUTGOING_FILE_CHUNK_SIZE", "64");
    cfdp_set_mib_parameter ("SAVE_INCOMPLETE_FILES", "no");
    cfdp_set_mib_parameter ("MY_ID","0.23");

    strncpy(BaseDir, "/tmp/cf/", CFDP_MAX_PATH_LEN);


    unsigned char test[] = {0x04, 0x00, 0x31, 0x13, 0x00, 0x18, 0x00, 0x00, 0x00, 0x01, 0x00, 0x17, 0x07, 0x80, 0x00, 0x00, 0x00, 0x0d, 0x16, 0x2f, 0x63, 0x66, 0x2f, 0x64, 0x6f, 0x77, 0x6e, 0x6c, 0x6f, 0x61, 0x64, 0x2f, 0x68, 0x65, 0x6c, 0x6c, 0x6f, 0x2e, 0x74, 0x78, 0x74, 0x13, 0x63, 0x66, 0x74, 0x65, 0x73, 0x74, 0x69, 0x6e, 0x67, 0x2f, 0x68, 0x65, 0x6c, 0x6c, 0x6f, 0x2e, 0x74, 0x78, 0x74};
    unsigned char test1[] = {0x14, 0x00, 0x11, 0x13, 0x00, 0x18, 0x00, 0x00, 0x00, 0x01, 0x00, 0x17, 0x00, 0x00, 0x00, 0x00, 0x48, 0x65, 0x6c, 0x6c, 0x6f, 0x20, 0x77, 0x6f, 0x72, 0x6c, 0x64, 0x21, 0x0a};
    unsigned char test2[] = {0x04, 0x00, 0x0a, 0x13, 0x00, 0x18, 0x00, 0x00, 0x00, 0x01, 0x00, 0x17, 0x04, 0x00, 0x33, 0xf2, 0x47, 0xfc, 0x00, 0x00, 0x00, 0x0d};


    AppData.RawPduInputBuf.length = sizeof(test);

    if(AppData.RawPduInputBuf.length > CF_INCOMING_PDU_BUF_SIZE){
    	printf("PDU Rcv Error:length %d exceeds CF_INCOMING_PDU_BUF_SIZE %d",AppData.RawPduInputBuf.length,CF_INCOMING_PDU_BUF_SIZE);
	}
    memset(&AppData.RawPduInputBuf.content[0], 0, sizeof(AppData.RawPduInputBuf));

    memcpy(&AppData.RawPduInputBuf.content[0], test, AppData.RawPduInputBuf.length);

    cfdp_give_pdu(AppData.RawPduInputBuf);
    cfdp_cycle_each_transaction();

    /*            */
    printf("\n\n\n\n");

    AppData.RawPduInputBuf.length = sizeof(test1);

    if(AppData.RawPduInputBuf.length > CF_INCOMING_PDU_BUF_SIZE){
    	printf("PDU Rcv Error:length %d exceeds CF_INCOMING_PDU_BUF_SIZE %d",AppData.RawPduInputBuf.length,CF_INCOMING_PDU_BUF_SIZE);
	}
    memset(&AppData.RawPduInputBuf.content[0], 0, sizeof(AppData.RawPduInputBuf));

    memcpy(&AppData.RawPduInputBuf.content[0], test1, AppData.RawPduInputBuf.length);

    cfdp_give_pdu(AppData.RawPduInputBuf);
    cfdp_cycle_each_transaction();

    /*            */
    printf("\n\n\n\n");
    AppData.RawPduInputBuf.length = sizeof(test2);

    if(AppData.RawPduInputBuf.length > CF_INCOMING_PDU_BUF_SIZE){
    	printf("PDU Rcv Error:length %d exceeds CF_INCOMING_PDU_BUF_SIZE %d",AppData.RawPduInputBuf.length,CF_INCOMING_PDU_BUF_SIZE);
	}

    memset(&AppData.RawPduInputBuf.content[0], 0, sizeof(AppData.RawPduInputBuf));
    memcpy(&AppData.RawPduInputBuf.content[0], test2, AppData.RawPduInputBuf.length);

    cfdp_give_pdu(AppData.RawPduInputBuf);


    return SUCCESS;
}





void CycleTransaction(const FunctionCallbackInfo<Value> &args){

	cfdp_cycle_each_transaction();
}


std::string Util_GetStdString(v8::Local<v8::String> str)
{
	v8::String::Utf8Value temp(str->ToString());
	return(std::string(*temp));
}

void Util_SetCallbackData(CallbackData * cd, Isolate * isolate, v8::Local<v8::Value> val)
{

	cd->Function.Reset(isolate,val.As<Function>());
	cd->IsDefined = true;

}

void RegisterCallbackOn(const FunctionCallbackInfo<Value> &args)
{
	std::string CbIndicator = Util_GetStdString(args[0]->ToString());

	Isolate * isolate = args.GetIsolate();

	if(CbIndicator == "info")
	{
		Util_SetCallbackData(&LogInfo, isolate, args[1]);
	}
	else if(CbIndicator == "debug")
	{
		Util_SetCallbackData(&LogDebug, isolate, args[1]);
	}
	else if(CbIndicator == "error")
	{
		Util_SetCallbackData(&LogError, isolate, args[1]);
	}
	else if(CbIndicator == "warning")
	{
		Util_SetCallbackData(&LogWarning, isolate, args[1]);
	}

}

void SetConfiguration(const FunctionCallbackInfo<Value> &args)
{
	Isolate* isolate = args.GetIsolate();
	if(args.Length() < 1 || !args[0]->IsObject()) {
	    isolate->ThrowException(Exception::TypeError(
	    String::NewFromUtf8(isolate, "Error: One object expected")));
	    return;
	  }

	Local<Context> context = isolate->GetCurrentContext();
	Local<Object> obj = args[0]->ToObject(context).ToLocalChecked();
	Local<Array> props = obj->GetOwnPropertyNames(context).ToLocalChecked();

  for(int i = 0, l = props->Length(); i < l; i++) {
	Local<Value> localKey = props->Get(i);
	Local<Value> localVal = obj->Get(context, localKey).ToLocalChecked();
	std::string key = *String::Utf8Value(localKey);
	std::string val = *String::Utf8Value(localVal);
	printf("key == %s\n", key);
	printf("val == %s\n", val);
  }

}

void AppInit(const FunctionCallbackInfo<Value> &args)
{
	CF_RegisterCallbacks();
	CF_SetMibParams();

}

void Initialize(Local<Object> exports)
{
	NODE_SET_METHOD(exports, "RegisterCallbackOn", RegisterCallbackOn);
	NODE_SET_METHOD(exports, "CycleTransaction", CycleTransaction);
	NODE_SET_METHOD(exports, "SetConfiguration", SetConfiguration);
	NODE_SET_METHOD(exports, "AppInit", AppInit);

}

NODE_MODULE(addon, Initialize);
