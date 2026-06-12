import { notFound, redirect } from "next/navigation";
import { getSessionUserFromCookies } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  RecordDetailClient,
  type RecordDetailDto,
} from "@/components/app/RecordDetailClient";

type PageProps = { params: Promise<{ recordId: string }> };

export default async function RecordDetailPage({ params }: PageProps) {
  const { recordId } = await params;
  const user = await getSessionUserFromCookies();
  if (!user) redirect("/login");

  const record = await prisma.record.findFirst({
    where: { id: recordId, userId: user.id },
    include: { files: { orderBy: { createdAt: "desc" } } },
  });
  if (!record) notFound();

  const initial: RecordDetailDto = JSON.parse(
    JSON.stringify({
      id: record.id,
      title: record.title,
      note: record.note,
      createdAt: record.createdAt,
      files: record.files,
    })
  );

  return (
    <div className="mx-auto max-w-3xl p-4 md:px-8 md:pt-8 md:pb-12">
      <RecordDetailClient initial={initial} />
    </div>
  );
}

