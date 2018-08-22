/****************************************************************************
*
*   Copyright (c) 2018 Windhover Labs, L.L.C. All rights reserved.
*
* Redistribution and use in source and binary forms, with or without
* modification, are permitted provided that the following conditions
* are met:
*
* 1. Redistributions of source code must retain the above copyright
*    notice, this list of conditions and the following disclaimer.
* 2. Redistributions in binary form must reproduce the above copyright
*    notice, this list of conditions and the following disclaimer in
*    the documentation and/or other materials provided with the
*    distribution.
* 3. Neither the name Windhover Labs nor the names of its 
*    contributors may be used to endorse or promote products derived 
*    from this software without specific prior written permission.
*
* THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
* "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
* LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS
* FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE
* COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
* INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING,
* BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS
* OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED
* AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT
* LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN
* ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
* POSSIBILITY OF SUCH DAMAGE.
*
*****************************************************************************/

'use strict';

const config = {
    CFE_SB_PACKET_TIME_FORMAT: 'CFE_SB_TIME_32_16_SUBS',
    CFE_TIME_EPOCH_YEAR:       1980,
    CFE_TIME_EPOCH_DAY:        1,
    CFE_TIME_EPOCH_HOUR:       0,
    CFE_TIME_EPOCH_MINUTE:     0,
    CFE_TIME_EPOCH_SECOND:     0,
    binTlmPort:                5011,
    binCmdPort:                5010,
    pbTlmPort:                 5012,
    pbCmdPort:                 5013,
    pbTlmOutPort:              5112,
    pbCmdInPort:               5109,
    msgDefs: [
    	{file: './output.json'},
    	{file: './output-cmd.json'},
    	{file: './input.json'}
    ],
    protoDefs: [
//    	{msg_id: , file: './proto_defs/es_app_name.proto'},
//    	{msg_id: , file: './proto_defs/es_app_reload.proto'},
//    	{msg_id: , file: './proto_defs/es_delete_cds.proto'},
//    	{msg_id: , file: './proto_defs/es_dump_cds_reg.proto'},
//    	{msg_id: , file: './proto_defs/es_hk.proto'},
//    	{msg_id: , file: './proto_defs/es_one_app.proto'},
//    	{msg_id: , file: './proto_defs/es_overwrite_sys_log.proto'},
//    	{msg_id: , file: './proto_defs/es_perf_set_filter_mask.proto'},
//    	{msg_id: , file: './proto_defs/es_perf_set_trig_mask.proto'},
//    	{msg_id: , file: './proto_defs/es_perf_start.proto'},
//    	{msg_id: , file: './proto_defs/es_perf_stop.proto'},
//    	{msg_id: , file: './proto_defs/es_query_all.proto'},
//    	{msg_id: , file: './proto_defs/es_query_all_tasks.proto'},
//    	{msg_id: , file: './proto_defs/es_restart.proto'},
//    	{msg_id: , file: './proto_defs/es_set_max_pr_count.prot'},
//    	{msg_id: , file: './proto_defs/es_shell_packet.proto'},
//    	{msg_id: , file: './proto_defs/es_shell.proto'},
//    	{msg_id: , file: './proto_defs/es_start_app.proto'},
//    	{msg_id: , file: './proto_defs/es_tlm_pool_stats_cmd.proto'},
//    	{msg_id: , file: './proto_defs/es_write_er_log.proto'}
    ]
}

exports = module.exports = config;

