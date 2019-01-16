#include <nan.h>
#include <fstream>
#include <iostream>
#include <string>
#include <typeinfo>
#include <stdarg.h>
#include "cf_app.h"

using namespace v8;

void Indication (INDICATION_TYPE IndType, TRANS_STATUS TransInfo)
{
		QueueEntry 	*queueEntryPtr = NULL;
	    int32_t		chan;
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
	            	QueueEntry 	*queueEntry = new QueueEntry;
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
	                    // AddFileToUpQueue(CFDP_UP_ACTIVEQ, queueEntryPtr);
	                    InfoEvent("CFDP::AddFileToUpQueue");
	                }
	                else
	                {
	                	ErrorEvent( "AllocQueueEntry returned NULL.");
	                }
	            }
	            else
	            {
	                /* file-send transaction */
	                // queueEntryPtr = FindNodeAtFrontOfQueue(TransInfo);
	            	queueEntryPtr = 0;
	            	InfoEvent("CFDP::FindNodeAtFrontOfQueue");

	                if(queueEntryPtr != NULL)
	                {
	                	InfoEvent( "Outgoing trans started %d.%d_%d,src %s",
	                                    TransInfo.trans.source_id.value[0],
	                                    TransInfo.trans.source_id.value[1],
	                                    TransInfo.trans.number,
	                                    &TransInfo.md.source_file_name[0]);

	                    queueEntryPtr->TransNum = TransInfo.trans.number;

	                    Chan[queueEntryPtr->ChanNum].DataBlast = CFDP_IN_PROGRESS;
	                    Chan[queueEntryPtr->ChanNum].TransNumBlasting = TransInfo.trans.number;

	                    /* move node from pending queue to active queue */
	                    /*
	                    RemoveFileFromPbQueue(queueEntryPtr->ChanNum,
	                                                CFDP_PB_PENDINGQ,
	                                                queueEntryPtr);
	                    AddFileToPbQueue(queueEntryPtr->ChanNum, CFDP_PB_ACTIVEQ,
	                                                queueEntryPtr);
	                    */
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
            	InfoEvent( "Incoming trans started %d.%d_%d,dest %s",
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
	            // chan = GetChanNumFromTransId(CFDP_PB_ACTIVEQ, TransInfo.trans.number);
	            if(chan != CFDP_ERROR)
	            {
	            	/* Start transfer of next file on queue (if queue has another file) */
	                // StartNextFile(chan);
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
	                    // strncpy(&Up.LastFileUplinked[0], &TransInfo.md.dest_file_name[0], CFDP_MAX_PATH_LEN);
	                    // MoveUpNodeActiveToHistory(entityIDBuf, TransInfo.trans.number);

	                	InfoEvent( "Incoming trans success %d.%d_%d,dest %s",
	                                TransInfo.trans.source_id.value[0],
	                                TransInfo.trans.source_id.value[1],
	                                TransInfo.trans.number,
	                                &TransInfo.md.dest_file_name[0]);
	                }
	                else
	                {
	                    /* successful file-send transaction processing */
	                    // chan = GetChanNumFromTransId(CFDP_PB_ACTIVEQ, TransInfo.trans.number);

	                    if(chan != CFDP_ERROR)
	                    {
	                        // Chan[chan].SuccessCounter++;
	                    	// queueEntryPtr = FindPbNodeByTransNum(chan, CFDP_PB_ACTIVEQ, TransInfo.trans.number);
	                        queueEntryPtr = 0;
	                    	if(queueEntryPtr != NULL)
	                        {
	                            queueEntryPtr->Status = CFDP_STAT_SUCCESS;
	                        }
	                    }

	                    // if(queueEntryPtr->Preserve == CFDP_DELETE_FILE)
	                    // {
	                    //     OS_remove(&TransInfo.md.source_file_name[0]);
	                    // }

	                    // MoveDwnNodeActiveToHistory(TransInfo.trans.number);

	                	InfoEvent( "Outgoing trans success %d.%d_%d,src %s",
	                                    TransInfo.trans.source_id.value[0],
	                                    TransInfo.trans.source_id.value[1],
	                                    TransInfo.trans.number,
	                                    &TransInfo.md.source_file_name[0]);
	                }
	            }
	            else
	            {
	                /* do transaction-failed processing */
	                /*
	            	sprintf(&App.LastFailedTrans[0],"%d.%d_%lu",
	                        TransInfo.trans.source_id.value[0],
	                        TransInfo.trans.source_id.value[1],
	                        TransInfo.trans.number);
					*/
	                /* increment the corresponding telemetry counter */
	                // IncrFaultCtr(&TransInfo);

	                /* for error event below */
	                /*
	            	GetFinalStatString(localFinalStatBuf,
	                                      TransInfo.final_status,
	                                      CFDP_MAX_ERR_STRING_CHARS);
					*/
	                /* for error event below */
	                /*
	            	GetCondCodeString(localCondCodeBuf,
	                                     TransInfo.condition_code,
	                                     CFDP_MAX_ERR_STRING_CHARS);
					*/

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

	                    // MoveUpNodeActiveToHistory(entityIDBuf, TransInfo.trans.number);

	                	InfoEvent( "Incoming trans %d.%d_%d %s,CondCode %s,dest %s",
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
	                    // chan = GetChanNumFromTransId(CFDP_PB_ACTIVEQ, TransInfo.trans.number);''

	                    // Chan[chan].FailedCounter++;
	                    // queueEntryPtr = FindPbNodeByTransNum(chan, CFDP_PB_ACTIVEQ, TransInfo.trans.number);
	                    queueEntryPtr = 0;
	                    if(queueEntryPtr != NULL)
	                    {
	                        queueEntryPtr->Status = TransInfo.final_status;
	                        queueEntryPtr->CondCode = TransInfo.condition_code;
	                    }

	                    // MoveDwnNodeActiveToHistory(TransInfo.trans.number);

	                	InfoEvent( "Outgoing trans %d.%d_%d %s,CondCode %s,Src %s,Ch %d ",
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

	                    //    if(AppData.Tbl->OuCh[Chan].DequeueEnable == ENABLED){
	                    //        StartNextFile(Chan);
	                    //    }/* end if */

	                    }/* end if */
	                } /* end if */

	            }/* end if */

	            break;

	        case IND_ACK_TIMER_EXPIRED:
	        	WarningEvent( "Ack Timer Expired %d.%d_%d,%s",
	                              TransInfo.trans.source_id.value[0],
	                              TransInfo.trans.source_id.value[1],
	                              TransInfo.trans.number,
	                              &TransInfo.md.source_file_name[0]);
	            break;

	        case IND_INACTIVITY_TIMER_EXPIRED:
	        	WarningEvent( "Inactivity Timer Expired %d.%d_%d,%s",
	                              TransInfo.trans.source_id.value[0],
	                              TransInfo.trans.source_id.value[1],
	                              TransInfo.trans.number,
	                              &TransInfo.md.source_file_name[0]);
	            break;

	        case IND_NAK_TIMER_EXPIRED:
	        	WarningEvent( "Nack Timer Expired %d.%d_%d,%s",
	                              TransInfo.trans.source_id.value[0],
	                              TransInfo.trans.source_id.value[1],
	                              TransInfo.trans.number,
	                              &TransInfo.md.source_file_name[0]);
	            break;

	        case IND_SUSPENDED:
	        	WarningEvent( "Transaction Suspended %d.%d_%d,%s",
	                              TransInfo.trans.source_id.value[0],
	                              TransInfo.trans.source_id.value[1],
	                              TransInfo.trans.number,
	                              &TransInfo.md.source_file_name[0]);
	            break;

	        case IND_RESUMED:
	        	WarningEvent( "Transaction Resumed %d.%d_%d,%s",
	                              TransInfo.trans.source_id.value[0],
	                              TransInfo.trans.source_id.value[1],
	                              TransInfo.trans.number,
	                              &TransInfo.md.source_file_name[0]);
	            break;

	        case IND_REPORT:
	            break;

	        case IND_FAULT:
	        	WarningEvent( "Fault %d,%d.%d_%d,%s",
	                              TransInfo.condition_code,
	                              TransInfo.trans.source_id.value[0],
	                              TransInfo.trans.source_id.value[1],
	                              TransInfo.trans.number,
	                              &TransInfo.md.source_file_name[0]);
	            break;

	        case IND_ABANDONED:
	        	WarningEvent( "Indication:Transaction Abandon %d.%d_%d,%s",
	                              TransInfo.trans.source_id.value[0],
	                              TransInfo.trans.source_id.value[1],
	                              TransInfo.trans.number,
	                              &TransInfo.md.source_file_name[0]);

//	            TotalAbandonTrans++;
	            break;

	        default:
	        	ErrorEvent( "Unexpected indication type %d.", IndType);
	            break;

	    }/* end switch */
	}

QueueEntry* FindUpNodeByTransID(uint32_t queue, char *srcEntityID, uint32_t trans)
{
	QueueEntry *qNodePtr;

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

boolean PduOutputOpen (ID SourceId, ID DestinationId)
{
	InfoEvent("PDU | Output is Open?");
	return (YES);
}

boolean PduOutputReady (PDU_TYPE PduType, TRANSACTION TransInfo,ID DestinationId){

	InfoEvent("PDU | Output is Ready?");

	int32_t 	Chan;
	char	SrcEntityIdBuf[CF_MAX_CFG_VALUE_CHARS];

	return (YES);
}

void PduOutputSend (TRANSACTION TransInfo,ID DestinationId, CFDP_DATA *PduPtr){

	InfoEvent("PDU | Output send?");
	return (YES);
}

int32_t Seek(int32_t  filedes, int32_t offset, uint32_t whence)
{

    if(filedes == CF_FD_ZERO_REPLACEMENT)
    {
    	filedes = 0;
    }
    return (fseek((uint32_t)filedes,offset,whence));
}

CFDP_FILE * FileOpen(const char *Name, const char *Mode){

	FILE	*fileHandle;
	char temp[CFDP_MAX_PATH_LEN];

	strncpy(temp, AppData.BaseDir, CFDP_MAX_PATH_LEN);
	strncat(temp, Name, CFDP_MAX_PATH_LEN);
    fileHandle = fopen(temp, Mode);
    return fileHandle;
}

size_t FileRead(void *Buffer, size_t Size,size_t Count, CFDP_FILE *File)
{
	size_t out_size = fread(Buffer, Size, Count, File);
	return out_size;
}

size_t FileWrite(const void *Buffer, size_t Size,size_t Count, CFDP_FILE *File)
{
	size_t out_size = fwrite(Buffer, Size, Count, File);
	return out_size;
}

int FileClose(CFDP_FILE *File)
{
	return fclose(File);
}

int FileSeek(CFDP_FILE *File, long int Offset, int Whence)
{
    int     	ReturnVal;
    uint16_t  	WhenceVal;
    int32_t   	SeekVal;

    WhenceVal = 0;
    ReturnVal = OS_SUCCESS;

    if(Whence == SEEK_SET)
    {
        WhenceVal = OS_SEEK_SET;
    }
    else if(Whence == SEEK_CUR)
    {
        WhenceVal = OS_SEEK_CUR;
    }
    else if(Whence == SEEK_END)
    {
        WhenceVal = OS_SEEK_END;
    }

    SeekVal = Seek((int32_t)File,(int32_t)Offset,WhenceVal);

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

int RemoveFile(const char *Name)
{
	char temp[CFDP_MAX_PATH_LEN];

	strncpy(temp, AppData.BaseDir, CFDP_MAX_PATH_LEN);
	strncat(temp, Name, CFDP_MAX_PATH_LEN);
	return remove(temp);
}

int RenameFile(const char *TempFileName, const char *NewName)
{
	char tempOld[CFDP_MAX_PATH_LEN];
	char tempNew[CFDP_MAX_PATH_LEN];

	strncpy(tempOld, AppData.BaseDir, CFDP_MAX_PATH_LEN);
	strncat(tempOld, TempFileName, CFDP_MAX_PATH_LEN);

	strncat(tempNew, NewName, CFDP_MAX_PATH_LEN);

	return rename(tempOld, tempNew);
}

u_int_4 FileSize(const char *Name)
{
	struct stat st;
	char temp[CFDP_MAX_PATH_LEN];

	strncpy(temp, AppData.BaseDir, CFDP_MAX_PATH_LEN);
	strncat(temp, Name, CFDP_MAX_PATH_LEN);
	stat(temp, &st);
	return st.st_size;
}

int InfoEvent(const char *Format, ...)
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
	else
	{
		printf("INFO : %s\n", &BigBuf);
	}


    return(Status);
}

int ErrorEvent(const char *Format, ...)
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
	else
	{
		printf("ERR : %s\n", &BigBuf);
	}

    return(Status);
}

int DebugEvent(const char *Format, ...)
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
	else
	{
		printf("DEBUG : %s\n", &BigBuf);
	}

    return(Status);
}

int WarningEvent(const char *Format, ...)
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
	else
	{
		printf("WARN : %s\n", &BigBuf);
	}

    return(Status);
}

void RegisterCallbacks(){

    register_indication (Indication);
    register_pdu_output_open (PduOutputOpen);
    register_pdu_output_ready (PduOutputReady);
    register_pdu_output_send (PduOutputSend);

    register_printf_debug(DebugEvent);
    register_printf_info(InfoEvent);
    register_printf_warning(WarningEvent);
    register_printf_error(ErrorEvent);

    register_file_size(FileSize);
    register_rename(RenameFile);
    register_remove(RemoveFile);
    register_fseek(FileSeek);
    register_fopen(FileOpen);
    register_fread(FileRead);
    register_fwrite(FileWrite);
    register_fclose(FileClose);

}

int ChannelInit()
{
	uint32_t i,j;

	/*
	AppData.Hk.App.BufferPoolHandle = AppData.Mem.PoolHdl;

	AppData.Hk.App.MaxMemNeeded  = (AppData.Tbl->UplinkHistoryQDepth * sizeof(CF_QueueEntry_t)) +
	                    (CF_MAX_SIMULTANEOUS_TRANSACTIONS * sizeof(CF_QueueEntry_t));
	*/

	for( i = 0; i< CF_MAX_PLAYBACK_CHANNELS; i++ )
	{
		AppData.Chan[i].DataBlast = CFDP_NOT_IN_PROGRESS;
		AppData.Chan[i].PendQTimer       = 0;
		AppData.Chan[i].PollDirTimer     = 0;
		AppData.Chan[i].TransNumBlasting = 0;

		AppData.Hk.Chan[i].PollDirsChecked = 0;
		AppData.Hk.Chan[i].PendingQChecked = 0;
		AppData.Hk.Chan[i].RedLightCntr  = 0;
		AppData.Hk.Chan[i].RedLightCntr  = 0;
		AppData.Hk.Chan[i].PDUsSent      = 0;
		AppData.Hk.Chan[i].FilesSent     = 0;
		AppData.Hk.Chan[i].SuccessCounter = 0;
		AppData.Hk.Chan[i].FailedCounter = 0;

		AppData.Chan[i].HandshakeSemId = CFDP_INVALID;

		/* initialize pending queue, active queue and history queue variables */
		for( j=0;j<CFDP_QUEUES_PER_CHAN;j++ )
		{
			AppData.Chan[i].PbQ[j].HeadPtr   = NULL;
			AppData.Chan[i].PbQ[j].TailPtr   = NULL;
			AppData.Chan[i].PbQ[j].EntryCnt  = 0;
		}

		/*
		if(AppData.Tbl->OuCh[i].EntryInUse == CF_ENTRY_IN_USE)
		{

		ChanMemNeeded = (AppData.Tbl->OuCh[i].PendingQDepth * sizeof(CF_QueueEntry_t)) +
				(AppData.Tbl->OuCh[i].HistoryQDepth * sizeof(CF_QueueEntry_t));

		AppData.Hk.App.MaxMemNeeded += ChanMemNeeded;

		}
		*/
	}


}

std::string GetStdString(v8::Local<v8::String> str)
{
	v8::String::Utf8Value temp(str->ToString());
	return(std::string(*temp));
}

void SetCallbackData(CallbackData * cd, Isolate * isolate, v8::Local<v8::Value> val)
{

	cd->Function.Reset(isolate,val.As<Function>());
	cd->IsDefined = true;

}

void GivePduToEngine(const FunctionCallbackInfo<Value> &args)
{
	Isolate* isolate = args.GetIsolate();

	if(args.Length() < 1 || !args[0]->IsObject()) {

	    isolate->ThrowException(Exception::TypeError(
	    String::NewFromUtf8(isolate, "Byte buffer object expected")));
	    return;

	}

	unsigned char* 	buffer 	= (unsigned char*) node::Buffer::Data(args[0]->ToObject());

	memset(&AppData.RawPduInputBuf.content[0], 0, sizeof(AppData.RawPduInputBuf));

	AppData.RawPduInputBuf.length = args[1]->Uint32Value();

	if(AppData.RawPduInputBuf.length > CF_INCOMING_PDU_BUF_SIZE){

		ErrorEvent("PDU Rcv Error:length %d exceeds INCOMING_PDU_BUF_SIZE %d",AppData.RawPduInputBuf.length,CF_INCOMING_PDU_BUF_SIZE);

	}

	memcpy(&AppData.RawPduInputBuf.content[0], buffer, AppData.RawPduInputBuf.length);

	cfdp_give_pdu(AppData.RawPduInputBuf);
}

void Cycle(const FunctionCallbackInfo<Value> &args){

	cfdp_cycle_each_transaction();
}

void RegisterCallbackOn(const FunctionCallbackInfo<Value> &args)
{
	std::string CbIndicator = GetStdString(args[0]->ToString());

	Isolate * isolate = args.GetIsolate();

	if(CbIndicator == "info")
	{
		SetCallbackData(&LogInfo, isolate, args[1]);
	}
	else if(CbIndicator == "debug")
	{
		SetCallbackData(&LogDebug, isolate, args[1]);
	}
	else if(CbIndicator == "error")
	{
		SetCallbackData(&LogError, isolate, args[1]);
	}
	else if(CbIndicator == "warning")
	{
		SetCallbackData(&LogWarning, isolate, args[1]);
	}

}

void SetConfig(const FunctionCallbackInfo<Value> &args)
{
	Isolate* isolate = args.GetIsolate();

	if(args.Length() < 1 || !args[0]->IsObject()) {

	    isolate->ThrowException(Exception::TypeError(
	    String::NewFromUtf8(isolate, "Config object expected")));
	    return;

	}

	Local<Context> 	context = 	isolate->GetCurrentContext();
	Local<Object> 	obj 	= 	args[0]->ToObject(context).ToLocalChecked();
	Local<Array> 	props 	= 	obj->GetOwnPropertyNames(context).ToLocalChecked();

  for(int i = 0, l = props->Length(); i < l; i++) {

	Local<Value> localKey = props->Get(i);
	Local<Value> localVal = obj->Get(context, localKey).ToLocalChecked();

	std::string key = GetStdString(localKey->ToString());
	std::string val = GetStdString(localVal->ToString());

	if ( key == "TEMP_BASE_DIR")
	{

		Config.TempBaseDir = val.c_str ();

	}
	else if (key =="TEMP_FILE_NAME_PREFIX")
	{
		Config.TempFileNamePrefix = val.c_str ();

	}

  }

}

void SetMibParams(const FunctionCallbackInfo<Value> &args)
{

	Isolate* isolate = args.GetIsolate();

	if(args.Length() < 1 || args.Length() > 2 || !args[0]->IsString() || !args[1]->IsString()) {

	    isolate->ThrowException(Exception::TypeError(
	    String::NewFromUtf8(isolate, "Key-Value pair expected")));
	    return;

	  }

	std::string str_key = GetStdString(args[0]->ToString());
	std::string str_val = GetStdString(args[1]->ToString());

	cfdp_set_mib_parameter (str_key.c_str (), str_val.c_str ());

}

void AppInit(const FunctionCallbackInfo<Value> &args)
{
	uint32_t i;
	/* Set temp base directory */
    strncpy(AppData.BaseDir, Config.TempBaseDir, CFDP_MAX_PATH_LEN);

    /* Register all callbacks */
	RegisterCallbacks();

    /* initialize uplink queues */
    for(i=0;i<NUM_UPLINK_QUEUES;i++)
    {
    	AppData.UpQ[i].HeadPtr   = NULL;
    	AppData.UpQ[i].TailPtr   = NULL;
    	AppData.UpQ[i].EntryCnt  = 0;
    }

    /* Initialize channel */
    ChannelInit();

    /* Initialize Housekeeping Counters */
    AppData.Hk.App.WakeupForFileProc   = 0;
    AppData.Hk.App.EngineCycleCount    = 0;
    AppData.Hk.App.QNodesAllocated     = 0;
    AppData.Hk.App.QNodesDeallocated   = 0;
    AppData.Hk.App.MemInUse            = 0;
    AppData.Hk.App.PeakMemInUse        = 0;
    AppData.Hk.App.MemAllocated        = CF_MEMORY_POOL_BYTES;
    AppData.Hk.App.PDUsReceived        = 0;
    AppData.Hk.App.PDUsRejected        = 0;
    AppData.Hk.App.TotalAbandonTrans   = 0;
    AppData.Hk.App.LastFailedTrans[0]  = '\0';

    AppData.Hk.Up.MetaCount            = 0;
    AppData.Hk.Up.SuccessCounter       = 0;
    AppData.Hk.Up.FailedCounter        = 0;
    AppData.Hk.Up.LastFileUplinked[0]  = '\0';

    AppData.Hk.AutoSuspend.EnFlag      = CFDP_DISABLED;

}

void Initialize(Local<Object> exports)
{

	NODE_SET_METHOD(exports, "AppInit", AppInit);

	NODE_SET_METHOD(exports, "SetMibParams", SetMibParams);

	NODE_SET_METHOD(exports, "SetConfig", SetConfig);

	NODE_SET_METHOD(exports, "RegisterCallbackOn", RegisterCallbackOn);

	NODE_SET_METHOD(exports, "GivePduToEngine", GivePduToEngine);

	NODE_SET_METHOD(exports, "Cycle", Cycle);


}

NODE_MODULE(addon, Initialize);
