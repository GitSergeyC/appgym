package kz.sergey.gym

import android.content.Context
import android.content.Intent
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.request.AggregateRequest
import androidx.health.connect.client.time.TimeRangeFilter
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.ZoneId

// Шаги из Health Connect (туда пишут Google Fit, Samsung Health и др.)
object StepsHelper {
    private val PERMS = setOf(HealthPermission.getReadPermission(StepsRecord::class))

    @JvmStatic
    fun status(ctx: Context): Int = HealthConnectClient.getSdkStatus(ctx)

    @JvmStatic
    fun permissionIntent(ctx: Context): Intent =
        PermissionController.createRequestPermissionResultContract().createIntent(ctx, PERMS)

    // -1 нет разрешения, -2 нет Health Connect, -3 ошибка
    @JvmStatic
    fun read(ctx: Context, date: String, cb: StepsCallback) {
        CoroutineScope(Dispatchers.IO).launch {
            val res: Long = try {
                if (HealthConnectClient.getSdkStatus(ctx) != HealthConnectClient.SDK_AVAILABLE) -2L
                else {
                    val c = HealthConnectClient.getOrCreate(ctx)
                    if (!c.permissionController.getGrantedPermissions().containsAll(PERMS)) -1L
                    else {
                        val d = LocalDate.parse(date)
                        val z = ZoneId.systemDefault()
                        val r = c.aggregate(
                            AggregateRequest(
                                setOf(StepsRecord.COUNT_TOTAL),
                                TimeRangeFilter.between(
                                    d.atStartOfDay(z).toInstant(),
                                    d.plusDays(1).atStartOfDay(z).toInstant()
                                )
                            )
                        )
                        r[StepsRecord.COUNT_TOTAL] ?: 0L
                    }
                }
            } catch (e: Exception) {
                -3L
            }
            cb.onResult(date, res)
        }
    }
}
