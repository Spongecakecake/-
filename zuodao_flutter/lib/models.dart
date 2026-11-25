// 数据模型（对应后端 JSON 结构）
import 'dart:math';

String _s(dynamic v) => (v ?? '') as String;
int _i(dynamic v) => (v as num?)?.toInt() ?? 0;

class Stats {
  final int total, approved, rejected, pending, bestStreak;
  const Stats({
    required this.total,
    required this.approved,
    required this.rejected,
    required this.pending,
    required this.bestStreak,
  });

  factory Stats.fromJson(Map<dynamic, dynamic> j) => Stats(
        total: _i(j['total']),
        approved: _i(j['approved']),
        rejected: _i(j['rejected']),
        pending: _i(j['pending']),
        bestStreak: _i(j['bestStreak']),
      );
}

class Participant {
  final String id, nickname, role;
  const Participant({required this.id, required this.nickname, required this.role});

  factory Participant.fromJson(Map<dynamic, dynamic> j) => Participant(
        id: _s(j['id']),
        nickname: _s(j['nickname']),
        role: _s(j['role']),
      );
}

class Checkin {
  final String id, day, note, status, reviewMessage, createdAt;
  const Checkin({
    required this.id,
    required this.day,
    required this.note,
    required this.status,
    required this.reviewMessage,
    required this.createdAt,
  });

  factory Checkin.fromJson(Map<dynamic, dynamic> j) => Checkin(
        id: _s(j['id']),
        day: _s(j['day']),
        note: _s(j['note']),
        status: _s(j['status']),
        reviewMessage: _s(j['reviewMessage']),
        createdAt: _s(j['createdAt']),
      );
}

class GoalEvent {
  final String id, type, message, at;
  const GoalEvent({
    required this.id,
    required this.type,
    required this.message,
    required this.at,
  });

  factory GoalEvent.fromJson(Map<dynamic, dynamic> j) => GoalEvent(
        id: _s(j['id']),
        type: _s(j['type']),
        message: _s(j['message']),
        at: _s(j['at']),
      );
}

class Proposal {
  final String result, proposedBy;
  final Map<String, bool> votes;
  const Proposal({
    required this.result,
    required this.proposedBy,
    required this.votes,
  });

  factory Proposal.fromJson(Map<dynamic, dynamic> j) => Proposal(
        result: _s(j['result']),
        proposedBy: _s(j['proposedBy']),
        votes: Map<String, bool>.from((j['votes'] as Map?) ?? {}),
      );
}

class Goal {
  final String id, title, template, description, startDate, endDate, rule;
  final String status, myRole;
  final String? inviteCode;
  final String giftName, giftNote;
  final String encouragement;
  final List<Participant> participants;
  final List<Checkin> checkins;
  final List<GoalEvent> events;
  final Stats stats;
  final int pendingToReview;
  final Proposal? resultProposal;

  const Goal({
    required this.id,
    required this.title,
    required this.template,
    required this.description,
    required this.startDate,
    required this.endDate,
    required this.rule,
    required this.status,
    required this.myRole,
    required this.inviteCode,
    required this.giftName,
    required this.giftNote,
    required this.encouragement,
    required this.participants,
    required this.checkins,
    required this.events,
    required this.stats,
    required this.pendingToReview,
    required this.resultProposal,
  });

  factory Goal.fromJson(Map<dynamic, dynamic> j) {
    final gift = (j['gift'] as Map?) ?? const {};
    final enc = (j['encouragement'] as Map?) ?? const {};
    final prop = j['resultProposal'] as Map?;
    return Goal(
      id: _s(j['id']),
      title: _s(j['title']),
      template: _s(j['template']),
      description: _s(j['description']),
      startDate: _s(j['startDate']),
      endDate: _s(j['endDate']),
      rule: _s(j['rule']),
      status: _s(j['status']),
      myRole: _s(j['myRole']),
      inviteCode: j['inviteCode'] as String?,
      giftName: _s(gift['name']),
      giftNote: _s(gift['note']),
      encouragement: _s(enc['message']),
      participants: ((j['participants'] as List?) ?? const [])
          .map((e) => Participant.fromJson(e as Map))
          .toList(),
      checkins: ((j['checkins'] as List?) ?? const [])
          .map((e) => Checkin.fromJson(e as Map))
          .toList(),
      events: ((j['events'] as List?) ?? const [])
          .map((e) => GoalEvent.fromJson(e as Map))
          .toList(),
      stats: Stats.fromJson((j['stats'] as Map?) ?? const {}),
      pendingToReview: _i(j['pendingToReview']),
      resultProposal: prop == null ? null : Proposal.fromJson(prop),
    );
  }
}

class Invite {
  final String code, title, template, rule, startDate, endDate;
  final String giftName;
  final String? ownerName;
  final bool supTaken, witTaken;
  const Invite({
    required this.code,
    required this.title,
    required this.template,
    required this.rule,
    required this.startDate,
    required this.endDate,
    required this.giftName,
    required this.ownerName,
    required this.supTaken,
    required this.witTaken,
  });

  factory Invite.fromJson(Map<dynamic, dynamic> j) {
    final gift = (j['gift'] as Map?) ?? const {};
    final taken = (j['taken'] as Map?) ?? const {};
    final owner = j['owner'] as Map?;
    return Invite(
      code: _s(j['code']),
      title: _s(j['title']),
      template: _s(j['template']),
      rule: _s(j['rule']),
      startDate: _s(j['startDate']),
      endDate: _s(j['endDate']),
      giftName: _s(gift['name']),
      ownerName: owner == null ? null : _s(owner['nickname']),
      supTaken: (taken['supervisor'] ?? false) as bool,
      witTaken: (taken['witness'] ?? false) as bool,
    );
  }
}

class Chapter {
  final int no;
  final String title, text;
  const Chapter({required this.no, required this.title, required this.text});

  factory Chapter.fromJson(Map<dynamic, dynamic> j) => Chapter(
        no: _i(j['no']),
        title: _s(j['title']),
        text: _s(j['text']),
      );
}

class Memoir {
  final String id, title, createdAt;
  final List<String> participants;
  final List<Chapter> chapters;
  const Memoir({
    required this.id,
    required this.title,
    required this.createdAt,
    required this.participants,
    required this.chapters,
  });

  factory Memoir.fromJson(Map<dynamic, dynamic> j) {
    final ps = ((j['participants'] as List?) ?? const [])
        .map((e) => _s((e as Map)['nickname']))
        .toList();
    return Memoir(
      id: _s(j['id']),
      title: _s(j['title']),
      createdAt: _s(j['createdAt']),
      participants: ps,
      chapters: ((j['chapters'] as List?) ?? const [])
          .map((e) => Chapter.fromJson(e as Map))
          .toList(),
    );
  }
}

class MemoirItem {
  final String id, title, createdAt;
  const MemoirItem({required this.id, required this.title, required this.createdAt});

  factory MemoirItem.fromJson(Map<dynamic, dynamic> j) => MemoirItem(
        id: _s(j['id']),
        title: _s(j['title']),
        createdAt: _s(j['createdAt']),
      );
}

String shortDate(String iso) =>
    iso.length >= 10 ? iso.substring(0, min(10, iso.length)) : iso;
